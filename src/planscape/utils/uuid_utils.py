import shortuuid

def generate_short_uuid(length=8):
    return shortuuid.ShortUUID().random(length=length)

