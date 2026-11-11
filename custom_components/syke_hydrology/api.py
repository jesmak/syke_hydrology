"""Syke's hydrology API (Hydrologiarajapinta), an OData v3 service.

A place (Paikka) in it is one quantity measured at one spot, so a station is the places sharing a name and a
municipality. Each quantity has a table of its own, keyed by the place and the day.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from enum import IntEnum
from typing import Any
from urllib.parse import quote

import aiohttp

BASE_URL = "https://rajapinnat.ymparisto.fi/api/Hydrologiarajapinta/1.1/odata"
TIMEOUT = aiohttp.ClientTimeout(total=60)


class Quantity(IntEnum):
    """The quantities (Suure_Id) the integration reads."""

    WATER_LEVEL = 1
    DISCHARGE = 2
    AREAL_PRECIPITATION = 5
    AREAL_SNOW = 7
    SNOW_COURSE = 8
    ICE = 9
    ICE_EVENTS = 10
    SURFACE_TEMPERATURE = 11


QUANTITIES = {int(quantity) for quantity in Quantity}


@dataclass(frozen=True)
class Table:
    name: str
    # The column with the day: every table has Aika, except the freeze-up and break-up dates, which are the value.
    day: str
    # The column that tells a quantity's series apart: a flag (Lippu), or the period of a precipitation sum (Jakso).
    kind: str | None


TABLES = {
    Quantity.WATER_LEVEL: Table("Vedenkorkeus", "Aika", None),
    Quantity.DISCHARGE: Table("Virtaama", "Aika", None),
    Quantity.AREAL_PRECIPITATION: Table("SadantaAlue", "Aika", "Jakso_Id"),
    Quantity.AREAL_SNOW: Table("LumiAlue", "Aika", None),
    Quantity.SNOW_COURSE: Table("LumiPiste", "Aika", None),
    Quantity.ICE: Table("Jaanpaksuus", "Aika", "Lippu_Id"),
    Quantity.ICE_EVENTS: Table("JaatJaanlahto", "Arvo", "Lippu_id"),
    Quantity.SURFACE_TEMPERATURE: Table("LampoPintavesi", "Aika", None),
}

# Tila_Id of a place that is no longer measured: 2 Lopetettu, 4 Ei poiminnassa.
ENDED = {2, 4}

# Korkeustaso_Id of the height systems, in the order a water level is given in: N2000, then N60, then N43.
HEIGHT_SYSTEMS = {5: "N2000", 1: "N60", 2: "N43"}


class SykeError(Exception):
    """Syke's API could not be read, or answered with something else than its data."""


@dataclass(frozen=True)
class Place:
    id: int
    quantity: Quantity
    name: str
    municipality: str
    # Degrees, for sorting the places by distance. None when Syke's coordinates can't be read.
    latitude: float | None = None
    longitude: float | None = None


@dataclass(frozen=True)
class Row:
    day: date
    value: float | None
    kind: int | None


@dataclass(frozen=True)
class Level:
    """How a station's water level readings, in centimetres above its own zero, become a height in a height system."""

    system: str
    correction: int


def _day(text: str) -> date:
    return datetime.fromisoformat(text).date()


def _degrees(text: Any) -> float | None:
    # KoordLat and KoordLong are degrees, minutes and seconds as "ddmmss".
    if not isinstance(text, str) or len(text.strip()) != 6 or not text.strip().isdigit():
        return None
    text = text.strip()
    return int(text[:2]) + int(text[2:4]) / 60 + int(text[4:]) / 3600


def _integer(value: Any) -> int:
    try:
        return int(value)
    except (TypeError, ValueError) as err:
        raise SykeError(f"Not a whole number: {value!r}") from err


def _number(value: Any) -> float | None:
    # Edm.Decimal comes as a string ("7.9"), Edm.Int32 as a number.
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError) as err:
        raise SykeError(f"Not a number: {value!r}") from err


class SykeClient:
    def __init__(self, session: aiohttp.ClientSession) -> None:
        self._session = session

    async def _get_all(self, path: str) -> list[dict[str, Any]]:
        """Every row of a query, following the 500-row pages."""
        rows: list[dict[str, Any]] = []
        url: str | None = f"{BASE_URL}/{path}"
        while url:
            try:
                async with self._session.get(url, timeout=TIMEOUT) as response:
                    if response.status != 200:
                        raise SykeError(f"Syke answered {response.status} to {url}")
                    body = await response.json(content_type=None)
            except (aiohttp.ClientError, TimeoutError, ValueError) as err:
                raise SykeError(f"Could not read {url}: {err}") from err
            if not isinstance(body, dict) or not isinstance(body.get("value"), list):
                raise SykeError(f"Unexpected answer to {url}")
            rows.extend(body["value"])
            url = body.get("odata.nextLink")
            if url is not None and not url.startswith(BASE_URL):
                raise SykeError(f"Unexpected next page {url}")
        return rows

    async def async_places(self) -> list[Place]:
        """Every place still measured, of the quantities read here."""
        places = []
        for row in await self._get_all("Paikka?$select=Paikka_Id,Suure_Id,Nimi,KuntaNimi,Tila_Id,KoordLat,KoordLong"):
            if row.get("Tila_Id") in ENDED or row.get("Suure_Id") not in QUANTITIES:
                continue
            places.append(
                Place(
                    id=_integer(row.get("Paikka_Id")),
                    quantity=Quantity(row["Suure_Id"]),
                    # Some names end in a space.
                    name=(row.get("Nimi") or "").strip(),
                    municipality=(row.get("KuntaNimi") or "").strip(),
                    latitude=_degrees(row.get("KoordLat")),
                    longitude=_degrees(row.get("KoordLong")),
                )
            )
        return places

    async def async_level(self, place_id: int) -> Level | None:
        """The height system a water level is given in, or None when the station has none and its own zero is used."""
        rows = await self._get_all(f"VedenkTasoTieto?$filter=Paikka_Id%20eq%20{place_id}")
        known = {row.get("Korkeustaso_Id"): row for row in rows}
        for system_id, system in HEIGHT_SYSTEMS.items():
            if (row := known.get(system_id)) is not None and row.get("Tasokorjaus") is not None:
                return Level(system, _integer(row["Tasokorjaus"]))
        return None

    async def async_rows(self, place: Place, since: date) -> list[Row]:
        """The place's rows from the day on, oldest first."""
        table = TABLES[place.quantity]
        moment = quote(f"datetime'{since.isoformat()}T00:00:00'")
        query = f"{table.name}?$filter=Paikka_Id%20eq%20{place.id}%20and%20{table.day}%20ge%20{moment}&$orderby={table.day}"
        rows = []
        for row in await self._get_all(query):
            try:
                day = _day(row[table.day])
            except (KeyError, TypeError, ValueError) as err:
                raise SykeError(f"No day in {table.name} row {row}") from err
            value = None if table.day == "Arvo" else _number(row.get("Arvo"))
            kind = row.get(table.kind) if table.kind else None
            rows.append(Row(day, value, kind))
        return rows
