import os, re
for f in ["frontend/src/types/index.ts"]:
    with open(f, "r") as file:
        lines = file.readlines()
    with open(f, "w") as file:
        for line in lines:
            if "watermark" not in line.lower() and "Watermark" not in line:
                file.write(line)
