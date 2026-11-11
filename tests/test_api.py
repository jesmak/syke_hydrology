"""Reading Syke's OData answers."""

from __future__ import annotations

from datetime import date

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from pytest_homeassistant_custom_component.test_util.aiohttp import AiohttpClientMocker

from custom_components.syke_hydrology.api import BASE_URL, Level, Place, Quantity, Row, SykeClient, SykeError

SINCE = "%20ge%20datetime%272027-01-01T00%3A00%3A00%27"


def rows_url(table: str, place_id: int, day_column: str = "Aika") -> str:
    return f"{BASE_URL}/{table}?$filter=Paikka_Id%20eq%20{place_id}%20and%20{day_column}{SINCE}&$orderby={day_column}"


async def test_decimals_come_as_strings_and_integers_as_numbers(hass: HomeAssistant, aioclient_mock: AiohttpClientMocker) -> None:
    aioclient_mock.get(
        rows_url("LampoPintavesi", 7),
        json={"value": [{"Paikka_Id": 7, "Aika": "2027-01-02T00:00:00", "Arvo": "0.4"}]},
    )
    aioclient_mock.get(
        rows_url("Jaanpaksuus", 8),
        json={"value": [{"Paikka_Id": 8, "Aika": "2027-01-02T00:00:00", "Arvo": 21, "Lippu_Id": 113}]},
    )
    client = SykeClient(async_get_clientsession(hass))
    temperature = await client.async_rows(Place(7, Quantity.SURFACE_TEMPERATURE, "", ""), date(2027, 1, 1))
    assert temperature == [Row(date(2027, 1, 2), 0.4, None)]
    thickness = await client.async_rows(Place(8, Quantity.ICE, "", ""), date(2027, 1, 1))
    assert thickness == [Row(date(2027, 1, 2), 21.0, 113)]


async def test_freeze_up_and_break_up_are_dates_in_the_value(hass: HomeAssistant, aioclient_mock: AiohttpClientMocker) -> None:
    aioclient_mock.get(
        rows_url("JaatJaanlahto", 9, "Arvo"),
        json={"value": [{"Paikka_Id": 9, "Arvo": "2027-01-15T00:00:00", "Lippu_id": 29}]},
    )
    client = SykeClient(async_get_clientsession(hass))
    events = await client.async_rows(Place(9, Quantity.ICE_EVENTS, "", ""), date(2027, 1, 1))
    assert events == [Row(date(2027, 1, 15), None, 29)]


async def test_pages_are_followed(hass: HomeAssistant, aioclient_mock: AiohttpClientMocker) -> None:
    second = f"{BASE_URL}/Vedenkorkeus?$skip=500"
    aioclient_mock.get(
        rows_url("Vedenkorkeus", 7),
        json={"value": [{"Paikka_Id": 7, "Aika": "2027-01-02T00:00:00", "Arvo": 300}], "odata.nextLink": second},
    )
    aioclient_mock.get(second, json={"value": [{"Paikka_Id": 7, "Aika": "2027-01-03T00:00:00", "Arvo": 301}]})
    client = SykeClient(async_get_clientsession(hass))
    level = await client.async_rows(Place(7, Quantity.WATER_LEVEL, "", ""), date(2027, 1, 1))
    assert [row.value for row in level] == [300.0, 301.0]


async def test_a_next_page_elsewhere_is_refused(hass: HomeAssistant, aioclient_mock: AiohttpClientMocker) -> None:
    aioclient_mock.get(rows_url("Vedenkorkeus", 7), json={"value": [], "odata.nextLink": "https://example.com/next"})
    client = SykeClient(async_get_clientsession(hass))
    with pytest.raises(SykeError):
        await client.async_rows(Place(7, Quantity.WATER_LEVEL, "", ""), date(2027, 1, 1))


async def test_an_error_answer_fails_loudly(hass: HomeAssistant, aioclient_mock: AiohttpClientMocker) -> None:
    aioclient_mock.get(rows_url("Vedenkorkeus", 7), status=500, text="stack trace")
    client = SykeClient(async_get_clientsession(hass))
    with pytest.raises(SykeError, match="500"):
        await client.async_rows(Place(7, Quantity.WATER_LEVEL, "", ""), date(2027, 1, 1))


async def test_the_list_skips_ended_places_and_other_quantities(hass: HomeAssistant, aioclient_mock: AiohttpClientMocker) -> None:
    url = f"{BASE_URL}/Paikka?$select=Paikka_Id,Suure_Id,Nimi,KuntaNimi,Tila_Id,KoordLat,KoordLong"
    place = {"Nimi": "Esimerkkijärvi", "KuntaNimi": "Kuopio", "KoordLat": "625330", "KoordLong": "274100"}
    aioclient_mock.get(
        url,
        json={
            "value": [
                {**place, "Paikka_Id": 1, "Suure_Id": 1, "Nimi": "Esimerkkijärvi ", "Tila_Id": 1},
                {**place, "Paikka_Id": 2, "Suure_Id": 1, "Tila_Id": 2},
                {**place, "Paikka_Id": 3, "Suure_Id": 12, "Tila_Id": 1},
                {**place, "Paikka_Id": 4, "Suure_Id": 9, "Tila_Id": 3, "KoordLat": "6253"},
            ]
        },
    )
    client = SykeClient(async_get_clientsession(hass))
    assert await client.async_places() == [
        # 62° 53′ 30″ and 27° 41′ 0″
        Place(1, Quantity.WATER_LEVEL, "Esimerkkijärvi", "Kuopio", 62.891666666666666, 27.683333333333334),
        Place(4, Quantity.ICE, "Esimerkkijärvi", "Kuopio", None, 27.683333333333334),
    ]


async def test_a_water_level_takes_n2000_first(hass: HomeAssistant, aioclient_mock: AiohttpClientMocker) -> None:
    aioclient_mock.get(
        f"{BASE_URL}/VedenkTasoTieto?$filter=Paikka_Id%20eq%207",
        json={
            "value": [
                {"Paikka_Id": 7, "Korkeustaso_Id": 1, "TasoKoordinaatisto": "N60", "Tasokorjaus": 7480},
                {"Paikka_Id": 7, "Korkeustaso_Id": 5, "TasoKoordinaatisto": "N2000", "Tasokorjaus": 7500},
            ]
        },
    )
    aioclient_mock.get(f"{BASE_URL}/VedenkTasoTieto?$filter=Paikka_Id%20eq%208", json={"value": []})
    client = SykeClient(async_get_clientsession(hass))
    assert await client.async_level(7) == Level("N2000", 7500)
    assert await client.async_level(8) is None


async def test_a_row_without_its_numbers_fails_as_syke_does(hass: HomeAssistant, aioclient_mock: AiohttpClientMocker) -> None:
    aioclient_mock.get(
        f"{BASE_URL}/Paikka?$select=Paikka_Id,Suure_Id,Nimi,KuntaNimi,Tila_Id,KoordLat,KoordLong",
        json={"value": [{"Suure_Id": 1, "Nimi": "Esimerkkijärvi", "KuntaNimi": "Kuopio", "Tila_Id": 1}]},
    )
    aioclient_mock.get(
        f"{BASE_URL}/VedenkTasoTieto?$filter=Paikka_Id%20eq%207",
        json={"value": [{"Paikka_Id": 7, "Korkeustaso_Id": 5, "TasoKoordinaatisto": "N2000", "Tasokorjaus": "x"}]},
    )
    client = SykeClient(async_get_clientsession(hass))
    with pytest.raises(SykeError):
        await client.async_places()
    with pytest.raises(SykeError):
        await client.async_level(7)
