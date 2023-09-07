"""
Specific Planscape settings can be overridden by the .env file.
These settings are

  SECRET_KEY:               Django key
  PLANSCAPE_DEBUG:          True or False

  PLANSCAPE_DATABASE_HOST: PostGIS hostname
  PLANSCAPE_DATABASE_NAME: PostGIS database name
  PLANSCAPE_DATABASE_USER: PostGIS user name
  PLANSCAPE_DATABASE_PASSWORD: PostGIS database password

  PLANSCAPE_ALLOWED_HOSTS:        Comma-separated string of addresses
  PLANSCAPE_CORS_ALLOWED_ORIGINS: Comma-separated string of addresses
  PLANSCAPE_CORS_ALLOWED_HOSTS:   Comma-separated string of addresses
  PLANSCAPE_CSRF_TRUSTED_ORIGINS: Comma-separated string of addresses

  PLANSCAPE_CACHE_BACKEND: Backend type for cache
  PLANSCAPE_CACHE_LOCATION: Cache location (important for memcached, etc.)
"""
import os
from pathlib import Path

import sentry_sdk
from corsheaders.defaults import default_headers
from decouple import config
from sentry_sdk.integrations.django import DjangoIntegration

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/4.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config("SECRET_KEY")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config("PLANSCAPE_DEBUG", default=False, cast=bool)

ALLOWED_HOSTS: list[str] = str(config("PLANSCAPE_ALLOWED_HOSTS", default="*")).split(
    ","
)


# Application definition
planscape_apps = [
    "attributes",
    "boundary",
    "conditions",
    "existing_projects",
    "plan",
    "planning",
    "stands",
    "users",
]
INSTALLED_APPS = [
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "corsheaders",
    "dj_rest_auth",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.gis",
    "forsys",
    "leaflet",
    "rest_framework",
    "rest_framework_gis",
    "rest_framework_simplejwt",
    "rest_framework.authtoken",
] + planscape_apps

# Middleware order matters because of layering dependencies
# https://docs.djangoproject.com/en/4.2/topics/http/middleware/#activating-middleware
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "planscape.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [os.path.join(BASE_DIR, "templates")],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "planscape.wsgi.application"

PLANSCAPE_DATABASE_HOST = config("PLANSCAPE_DATABASE_HOST", default="localhost")
PLANSCAPE_DATABASE_PASSWORD = config("PLANSCAPE_DATABASE_PASSWORD", default="pass")
PLANSCAPE_DATABASE_USER = config("PLANSCAPE_DATABASE_USER", default="planscape")
PLANSCAPE_DATABASE_NAME = config("PLANSCAPE_DATABASE_NAME", default="planscape")
PLANSCAPE_DATABASE_PORT = config("PLANSCAPE_PORT", default=5432)
DATABASES = {
    "default": {
        "ENGINE": "django.contrib.gis.db.backends.postgis",
        "HOST": PLANSCAPE_DATABASE_HOST,
        "NAME": PLANSCAPE_DATABASE_NAME,
        "USER": PLANSCAPE_DATABASE_USER,
        "PASSWORD": PLANSCAPE_DATABASE_PASSWORD,
        "PORT": PLANSCAPE_DATABASE_PORT,
        "TEST": {
            "NAME": "auto_test",
        },
    }
}


# Password validation
# https://docs.djangoproject.com/en/4.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/4.1/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/4.1/howto/static-files/

STATIC_URL = "static/"

# Default primary key field type
# https://docs.djangoproject.com/en/4.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

SPATIALITE_LIBRARY_PATH = "/opt/homebrew/lib/mod_spatialite.dylib"

CORS_ALLOWED_ORIGINS = str(
    config("PLANSCAPE_CORS_ALLOWED_ORIGINS", default="http://localhost:4200")
).split(",")
CORS_ALLOWED_HOSTS = str(
    config("PLANSCAPE_CORS_ALLOWED_HOSTS", default="http://localhost:4200")
).split(",")
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = list(default_headers) + ["Set-Cookie"]

# Cross-Site Request Forgery protection settings
CSRF_USE_SESSIONS = False
CSRF_COOKIE_HTTPONLY = False
CSRF_TRUSTED_ORIGINS = str(
    config("PLANSCAPE_CSRF_TRUSTED_ORIGINS", default="http://localhost:4200")
).split(",")
CSRF_HEADER_NAME = "CSRF_COOKIE"
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
CSRF_COOKIE_SAMESITE = None
SESSION_COOKIE_SAMESITE = None

# True if a non-logged-in user can save plans.
PLANSCAPE_GUEST_CAN_SAVE = True

# Authentication settings (dj-rest-auth)

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "dj_rest_auth.jwt_auth.JWTCookieAuthentication",
    ),
    "NON_FIELD_ERRORS_KEY": "global",
}

REST_AUTH = {
    "USE_JWT": True,
    "JWT_AUTH_COOKIE": "my-app-auth",
    "JWT_AUTH_REFRESH_COOKIE": "my-refresh-token",
    "JWT_AUTH_HTTPONLY": False,
    "REGISTER_SERIALIZER": "users.serializers.NameRegistrationSerializer",
    "OLD_PASSWORD_FIELD_ENABLED": True,
}

AUTHENTICATION_BACKENDS = [
    # Needed to login by username in Django admin, regardless of `allauth`
    "django.contrib.auth.backends.ModelBackend",
    # `allauth` specific authentication methods, such as login by e-mail
    "allauth.account.auth_backends.AuthenticationBackend",
]

# allauth

SITE_ID = 1
ACCOUNT_AUTHENTICATION_METHOD = "email"
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_EMAIL_VERIFICATION = "mandatory"
ACCOUNT_LOGIN_ON_EMAIL_CONFIRMATION = True
ACCOUNT_LOGOUT_ON_GET = True
ACCOUNT_USERNAME_REQUIRED = False
LOGOUT_ON_PASSWORD_CHANGE = False

# TODO: Replace with shared email component.
EMAIL_BACKEND='django.core.mail.backends.console.EmailBackend'

# PostGIS constants. All raster data should be ingested with a common
# Coordinate Reference System (CRS).  The values below are those for the
# Regional Resource Kits: the CRS code used for the rasters, and the proj4
# representation of that coordinate system.
CRS_FOR_RASTERS = 3857
CRS_9822_PROJ4 = (
    "+proj=aea +lat_0=23 +lon_0=-96 +lat_1=29.5 +lat_2=45.5 +x_0=0 +y_0=0 "
    "+datum=WGS84 +units=m +no_defs"
)
CRS_9822_SCALE = (300, -300)  # a raster transform has origin, scale, and skew.

# The area of a raster pixel (in km-squared).
RASTER_PIXEL_AREA = 0.300 * 0.300

# This is the default CRS used when a geometry is missing one.
DEFAULT_CRS = 4269

# Caching; this improves loading times especially for the boundary app.
CACHES = {
    "default": {
        "BACKEND": config(
            "PLANSCAPE_CACHE_BACKEND",
            default="django.core.cache.backends.locmem.LocMemCache",
        ),
        "LOCATION": config("PLANSCAPE_CACHE_LOCATION", "planscape-cache"),
    }
}

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname}: {name}.{message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "level": "DEBUG",
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "WARNING",
    },
}


ENV = config("ENV", "dev")
SENTRY_DSN = config("SENTRY_DSN", None)
if SENTRY_DSN is not None:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(),
        ],
        traces_sample_rate=0.05,
        send_default_pii=True,
        environment=ENV,
    )

DEFAULT_CONDITIONS_FILE = config(
    "DEFAULT_CONDITIONS_FILE", BASE_DIR / "config" / "conditions.json"
)
RASTER_ROOT = config("RASTER_ROOT", "/mnt/gis/planscape")
RASTER_TILE = config("RASTER_TILE", "32x32")
