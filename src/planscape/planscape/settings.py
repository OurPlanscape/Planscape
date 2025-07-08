import logging
import multiprocessing
import os
import sys
from datetime import timedelta
from pathlib import Path

import boto3
import django_stubs_ext
import sentry_sdk
from corsheaders.defaults import default_headers
from decouple import Config, RepositoryEnv
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.django import DjangoIntegration
from utils.logging import NotInTestingFilter

config = Config(RepositoryEnv("../../.env"))
django_stubs_ext.monkeypatch()

TESTING_MODE = "test" in sys.argv
LOGLEVEL = config("LOGLEVEL", default="INFO", cast=str)

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
PLANSCAPE_APPS = [
    "admin.apps.PlanscapeAdmin",
    "boundary",
    "collaboration",
    "conditions",
    "core",
    "datasets",
    "e2e",
    "impacts",
    "martin",
    "organizations",
    "planning",
    "restrictions",
    "stands",
    "users",
    "utils",
]
INSTALLED_APPS = [
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "corsheaders",
    "dj_rest_auth",
    "dj_rest_auth.registration",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.gis",
    "django_extensions",
    "django_json_widget",
    "actstream",
    "password_policies",
    "rest_framework",
    "rest_framework_gis",
    "rest_framework_simplejwt",
    "rest_framework.authtoken",
    "drf_spectacular",
    "treebeard",
    "martor",
] + PLANSCAPE_APPS

# Middleware order matters because of layering dependencies
# https://docs.djangoproject.com/en/4.2/topics/http/middleware/#activating-middleware
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
]

ROOT_URLCONF = "planscape.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [
            os.path.join(BASE_DIR, "templates"),
            os.path.join(BASE_DIR, "templates/allauth"),
            os.path.join(BASE_DIR, "templates/treebeard"),
        ],
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
CONN_MAX_AGE = 60

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
    {
        "NAME": "users.reused_password_validator.CustomReusedPasswordValidator",
        "OPTIONS": {
            "record_length": 10,
        },
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

STATIC_URL = "planscape-backend/static/"
DEFAULT_STATIC_ROOT = BASE_DIR / "compiled-static/"
STATIC_ROOT = config("STATIC_ROOT", DEFAULT_STATIC_ROOT.resolve())
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
# Default primary key field type
# https://docs.djangoproject.com/en/4.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

SPATIALITE_LIBRARY_PATH = "/opt/homebrew/lib/mod_spatialite.dylib"

CORS_ALLOWED_ORIGINS = str(
    config("PLANSCAPE_CORS_ALLOWED_ORIGINS", default="http://localhost:4200")
).split(",")
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = list(default_headers) + ["Set-Cookie"]

# Cross-Site Request Forgery protection settings
CSRF_USE_SESSIONS = False
CSRF_COOKIE_HTTPONLY = False
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
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": None,
    "PAGE_SIZE": 50,
    "DATETIME_FORMAT": "%Y-%m-%dT%H:%M:%SZ",  # ISO 8601 format without microseconds
    "DATETIME_INPUT_FORMATS": [
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%SZ",  # Optional: to accept inputs with 'Z' indicating UTC time
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

REST_AUTH = {
    "USE_JWT": True,
    "JWT_AUTH_COOKIE": "my-app-auth",
    "JWT_AUTH_REFRESH_COOKIE": "my-refresh-token",
    "JWT_AUTH_REFRESH_COOKIE_PATH": "/",
    "JWT_AUTH_SAMESITE": "Lax",
    "JWT_AUTH_HTTPONLY": False,
    "OLD_PASSWORD_FIELD_ENABLED": True,
    "JWT_SERIALIZER_WITH_EXPIRATION": "dj_rest_auth.serializers.JWTSerializerWithExpiration",
    "REGISTER_SERIALIZER": "users.serializers.NameRegistrationSerializer",
    "PASSWORD_CHANGE_SERIALIZER": "users.serializers.CustomPasswordChangeSerializer",
    "PASSWORD_RESET_SERIALIZER": "users.serializers.CustomPasswordResetSerializer",
    "PASSWORD_RESET_CONFIRM_SERIALIZER": "users.serializers.CustomPasswordResetConfirmSerializer",
    "LANGUAGE_CODE": "en-us",
    "SESSION_LOGIN": False,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=3),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=90),
    "ROTATE_REFRESH_TOKENS": True,  # ensure the Refresh token is invalidated at each login
}

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "users.backends.PlanscapeAuthBackend",
]

# allauth

SITE_ID = 1
ACCOUNT_AUTHENTICATION_METHOD = "email"
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_EMAIL_VERIFICATION = str(
    config("ACCOUNT_EMAIL_VERIFICATION", default="mandatory")
)
ACCOUNT_EMAIL_SUBJECT_PREFIX = "[Planscape] "
ACCOUNT_LOGIN_ON_EMAIL_CONFIRMATION = True
ACCOUNT_LOGOUT_ON_GET = True
ACCOUNT_USERNAME_REQUIRED = False
LOGOUT_ON_PASSWORD_CHANGE = False
ACCOUNT_ADAPTER = "users.allauth_adapter.CustomAllauthAdapter"
PASSWORD_RESET_TIMEOUT = 1800  # 30 minutes.

DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="no-reply@planscape.org")
EMAIL_BACKEND = config(
    "EMAIL_BACKEND", default="django.core.mail.backends.smtp.EmailBackend"
)
EMAIL_HOST = config("EMAIL_HOST", default="smtp.google.com")
EMAIL_UNKNOWN_ACCOUNTS = True
EMAIL_USE_TLS = config("EMAIL_USE_TLS", default=True, cast=bool)
EMAIL_PORT = config("EMAIL_PORT", cast=int, default=587)
EMAIL_HOST_USER = config("EMAIL_HOST_USER", default=DEFAULT_FROM_EMAIL)
EMAIL_HOST_PASSWORD = config("EMAIL_BACKEND_APP_PASSWORD", default="UNSET")

PLANSCAPE_BASE_URL = config("PLANSCAPE_BASE_URL", default="localhost")

SESSION_REMEMBER = True
SESSION_COOKIE_AGE = 60 * 60 * 24 * 90  # 90 days
SESSION_EXPIRE_AT_BROWSER_CLOSE = False

# PostGIS constants. All raster data should be ingested with a common
# Coordinate Reference System (CRS).  The values below are those for the
# Regional Resource Kits: the CRS code used for the rasters, and the proj4
# representation of that coordinate system.
DEFAULT_CRS = 4269
CRS_FOR_RASTERS = 3857
CRS_INTERNAL_REPRESENTATION = DEFAULT_CRS
CRS_9822_PROJ4 = (
    "+proj=aea +lat_0=23 +lon_0=-96 +lat_1=29.5 +lat_2=45.5 +x_0=0 +y_0=0 "
    "+datum=WGS84 +units=m +no_defs"
)
CRS_9822_SCALE = (300, -300)  # a raster transform has origin, scale, and skew.

# The area of a raster pixel (in km-squared).
RASTER_PIXEL_AREA = 0.300 * 0.300

# This is the default CRS used when a geometry is missing one.

# Caching; this improves loading times especially for the boundary app.
REDIS_URL = config(
    "REDIS_URL", default=config("CACHEOPS_REDIS", "redis://localhost:6379/1")
)

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
        "TIMEOUT": None,
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
    "filters": {
        "testing": {
            "()": NotInTestingFilter,
        }
    },
    "handlers": {
        "console": {
            "level": LOGLEVEL,
            "formatter": "verbose",
            "class": "logging.StreamHandler",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": LOGLEVEL,
    },
}


ENV = config("ENV", "dev")
PROVIDER = config("PROVIDER", "aws", cast=str).lower()
SENTRY_DSN = config("SENTRY_DSN", None)
if SENTRY_DSN is not None:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(),
            CeleryIntegration(),
        ],
        send_default_pii=True,
        environment=ENV,
        enable_tracing=True,
        profiles_sample_rate=0.1,
        traces_sample_rate=0.05,
    )

DEFAULT_CONDITIONS_FILE = config(
    "DEFAULT_CONDITIONS_FILE", BASE_DIR / "config" / "conditions.json"
)
DEFAULT_TREATMENTS_FILE = config(
    "DEFAULT_TREATMENTS_FILE", BASE_DIR / "config" / "treatment_goals.json"
)
RASTER_ROOT = config("RASTER_ROOT", "/mnt/gis/planscape")
RASTER_TILE = config("RASTER_TILE", "32x32")
GDAL_NUM_THREADS = config(
    "GDAL_NUM_THREADS", default=multiprocessing.cpu_count(), cast=int
)

FORSYS_PATCHMAX_SCRIPT = BASE_DIR / "rscripts" / "forsys.R"

# FORSYS API
FORSYS_PLUMBER_URL = config("FORSYS_PLUMBER_URL", "http://forsys:8000/")
FORSYS_PLUMBER_TIMEOUT = config("FORSYS_PLUMBER_TIMEOUT", 600, cast=int)  # 10m
FORSYS_VIA_API = config("FORSYS_VIA_API", False, cast=bool)

# TODO: Move this to a conf file that R can read?
OUTPUT_DIR = config("FORSYS_OUTPUT_DIR", default=BASE_DIR / "output")

DEFAULT_ESTIMATED_COST = config("DEFAULT_ESTIMATED_COST", 2470, cast=float)
# CACHEOPS
CACHEOPS_REDIS = config("CACHEOPS_REDIS", "redis://localhost:6379/1")
DEFAULT_CACHE_TTL = config("DEFAULT_CACHE_TTL", 5 * 60, cast=int)  # 5 minutes default
FIND_ANYTHING_TTL = config("FIND_ANYTHING_TTL", DEFAULT_CACHE_TTL)
BROWSE_DATASETS_TTL = config("BROWSE_DATASETS_TTL", DEFAULT_CACHE_TTL)
CATEGORY_PATH_TTL = config("CATEGORY_PATH_TTL", 3600)  # 1 hour
S3_PUBLIC_URL_TTL = config("S3_PUBLIC_URL_TTL", 3600)  # 1 hour
GCS_PUBLIC_URL_TTL = config("GCS_PUBLIC_URL_TTL", 3600, cast=int)  # 1 hour

# CELERY
CELERY_BROKER_URL = config("CELERY_BROKER_URL", "redis://localhost:6379/0")

CELERY_RESULT_BACKEND = config("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_RESULT_ACCEPT_CONTENT = ("json",)
# fetches ONE task at a time
CELERY_WORKER_PREFETCH_MULTIPLIER = config(
    "CELERY_WORKER_PREFETCH_MULTIPLIER", 1, cast=int
)
CELERY_WORKER_MAX_TASKS_PER_CHILD = config(
    "CELERY_WORKER_MAX_TASKS_PER_CHILD", 20, cast=int
)
CELERY_TASK_DEFAULT_QUEUE = "default"
# if not specified here it will be sent to the default queue
CELERY_TASK_AUTODISCOVER = True

CELERY_TASK_ROUTES = {
    "planning.tasks.*": {"queue": "forsys"},
    "impacts.tasks.*": {"queue": "impacts"},
    "e2e.tasks.*": {"queue": "default"},
}

CELERY_ALWAYS_EAGER = config("CELERY_ALWAYS_EAGER", False)

TREATMENTS_TEST_FIXTURES_PATH = BASE_DIR / "scenario_fixtures"

SHARED_LINKS_NUM_DAYS_VALID = 60
CRONJOBS = [
    ("0 0 * * *", "planning.cron.delete_old_shared_links"),  # Runs at midnight daily
]

REPORT_RECIPIENT_EMAIL = config("REPORT_RECIPIENT_EMAIL", default=DEFAULT_FROM_EMAIL)


AREA_SRID = 5070
CONVERSION_SQM_ACRES = 4046.8564213562374

ACTSTREAM_SETTINGS = {
    "USE_JSONFIELD": True,
    "FETCH_RELATIONS": True,
    "GFK_FETCH_DEPTH": 1,
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Planscape API",
    "DESCRIPTION": "Planscape is a project that allows regional planners to determine the best locations & interventions to the landscape based on hard data.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

S3_BUCKET = config("S3_BUCKET", "planscape-control-dev")
AWS_ACCESS_KEY_ID = config("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = config("AWS_SECRET_ACCESS_KEY")
AWS_DEFAULT_REGION = config("AWS_DEFAULT_REGION", "us-west-2")
UPLOAD_EXPIRATION_TTL = config("UPLOAD_EXPIRATION_TTL", default=3600, cast=int)
DATALAYERS_FOLDER = "datalayers"
GCS_BUCKET = config("GCS_BUCKET", "planscape-datastore-dev")
GOOGLE_APPLICATION_CREDENTIALS_FILE = config(
    "GOOGLE_APPLICATION_CREDENTIALS_FILE", default=None
)
if PROVIDER == "aws":
    os.environ["AWS_ACCESS_KEY_ID"] = str(AWS_ACCESS_KEY_ID)
    os.environ["AWS_SECRET_ACCESS_KEY"] = str(AWS_SECRET_ACCESS_KEY)
    os.environ["AWS_DEFAULT_REGION"] = str(AWS_DEFAULT_REGION)
elif PROVIDER == "gcp":
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(
        GOOGLE_APPLICATION_CREDENTIALS_FILE
    )


boto3.set_stream_logger(name="botocore.credentials", level=logging.ERROR)

MAIN_ORG_NAME = config("MAIN_ORG_NAME", default="Spatial Informatics Group")

GDAL_CACHE_MAX = config("GDAL_CACHE_MAX", "15%")
CPL_DEBUG = config("CPL_DEBUG", False, cast=bool)
OGR2OGR_TIMEOUT = config("OGR2OGR_TIMEOUT", 600)  # 10m
ZIP_TIMEOUT = config("ZIP_TIMEOUT", 600)  # 10m
ADMIN_URL_PREFIX = config("ADMIN_URL_PREFIX", "admin")
FEATURE_FLAG_S3_PROXY = config("FEATURE_FLAG_S3_PROXY", False, cast=bool)

# OPENPANEL config
OPENPANEL_URL = config("OPENPANEL_URL", None)
OPENPANEL_CLIENT_ID = config("OPENPANEL_CLIENT_ID", None)
OPENPANEL_CLIENT_SECRET = config("OPENPANEL_CLIENT_SECRET", None)

# MARTOR (ADMIN MARKDOWN EDITOR)
MARTOR_TOOLBAR_BUTTONS = [
    "bold",
    "italic",
    "heading",
    "link",
    "toggle-maximize",
    "help",
]

DEFAULT_ORGANIZATION_NAME = "Spatial Informatics Group"
DEFAULT_ADMIN_EMAIL = "admin@planscape.org"
DEFAULT_BASELAYERS_DATASET_ID = 999


USE_SCENARIO_V2 = config("USE_SCENARIO_V2", default=False, cast=bool)
FEATURE_FLAGS = config(
    "FEATURE_FLAGS", default="", cast=lambda x: list(set(x.split(",")))
)
