"""Constants for SYKE hydrology."""

from __future__ import annotations

from datetime import timedelta

DOMAIN = "syke_hydrology"

# Syke's open data is CC BY 4.0, credited as the data's name and Syke as its source.
ATTRIBUTION = "Hydrologiarajapinta / Source: Finnish Environment Institute (Syke), CC BY 4.0"

UPDATE_INTERVAL = timedelta(hours=1)

CONF_QUANTITY = "quantity"
CONF_STATION = "station"
CONF_PLACES = "places"
CONF_MEASUREMENTS = "measurements"

# The ice bearing limits, in centimetres of bearing ice, and how old an ice measurement may be before it is called old.
CONF_WALKING = "walking"
CONF_SNOWMOBILE = "snowmobile"
CONF_CAR = "car"
CONF_MAX_AGE = "max_age"

DEFAULT_WALKING = 10
DEFAULT_SNOWMOBILE = 15
DEFAULT_CAR = 20
DEFAULT_MAX_AGE = 14
