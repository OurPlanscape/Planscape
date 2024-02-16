def snake_to_capitals(filename):
    name = str(filename).split(".")
    words = name[0].split("_")
    return " ".join(word.title() for word in words)
