from requests import Session
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


class RequestSessionWrap(Session):
    def __init__(self):
        super().__init__()
        retries = 5
        backoff_factor = 1
        status_forcelist = (500, 502, 504)
        retry = Retry(
            total=retries,
            read=retries,
            connect=retries,
            backoff_factor=backoff_factor,
            status_forcelist=status_forcelist,
        )
        adapter = HTTPAdapter(max_retries=retry)
        self.mount("http://", adapter)
        self.mount("https://", adapter)
