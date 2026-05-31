"""
Parse lp.sql and write airports.csv + countries.csv into the same directory.
Run once: python sql_to_csv.py
"""
import re
import csv
import os

SQL_FILE = r"C:\Users\makuz\Desktop\metropolia\info\Tietokannat\lp.sql"
OUT_DIR = os.path.dirname(os.path.abspath(__file__))

# Airport column indexes (from CREATE TABLE order):
# 0=id, 1=ident, 2=type, 3=name, 4=latitude_deg, 5=longitude_deg,
# 6=elevation_ft, 7=continent, 8=iso_country, 9=iso_region, 10=municipality, ...
AIRPORT_COLS = {"ident": 1, "type": 2, "name": 3, "lat": 4, "lng": 5,
                "iso_country": 8, "municipality": 10}

# Country column indexes: 0=iso_country, 1=name
COUNTRY_COLS = {"iso_country": 0, "name": 1}


def parse_row(s):
    """Parse a comma-separated SQL values string, handling quoted strings and NULL."""
    vals = []
    i, n = 0, len(s)
    while i < n:
        c = s[i]
        if c == "'":
            i += 1
            buf = []
            while i < n:
                if s[i] == '\\' and i + 1 < n:
                    buf.append(s[i + 1])
                    i += 2
                elif s[i] == "'":
                    i += 1
                    break
                else:
                    buf.append(s[i])
                    i += 1
            vals.append(''.join(buf))
        elif s[i:i + 4] == 'NULL':
            vals.append(None)
            i += 4
        elif c == ',':
            i += 1
        else:
            j = i
            while j < n and s[j] != ',':
                j += 1
            vals.append(s[i:j])
            i = j
    return vals


def extract_rows(line):
    """Extract all (...) row tuples from an INSERT INTO ... VALUES ... line."""
    m = re.search(r'VALUES\s*', line)
    if not m:
        return []
    rest = line[m.end():]
    rows = []
    i = 0
    while i < len(rest):
        if rest[i] != '(':
            i += 1
            continue
        depth, j, in_str = 0, i, False
        while j < len(rest):
            c = rest[j]
            if in_str:
                if c == '\\':
                    j += 2
                    continue
                if c == "'":
                    in_str = False
            elif c == "'":
                in_str = True
            elif c == '(':
                depth += 1
            elif c == ')':
                depth -= 1
                if depth == 0:
                    break
            j += 1
        rows.append(parse_row(rest[i + 1:j]))
        i = j + 1
    return rows


def main():
    airports, countries = [], []

    with open(SQL_FILE, encoding='utf-8', errors='replace') as f:
        for line in f:
            line = line.strip()

            if line.startswith('INSERT INTO `airport`'):
                for row in extract_rows(line):
                    if len(row) <= max(AIRPORT_COLS.values()):
                        continue
                    typ = row[AIRPORT_COLS["type"]]
                    name = row[AIRPORT_COLS["name"]] or ''
                    if typ != 'large_airport':
                        continue
                    if 'CLICK HERE' in name.upper():
                        continue
                    airports.append([
                        row[AIRPORT_COLS["ident"]] or '',
                        name,
                        row[AIRPORT_COLS["lat"]] or '',
                        row[AIRPORT_COLS["lng"]] or '',
                        row[AIRPORT_COLS["municipality"]] or '',
                        row[AIRPORT_COLS["iso_country"]] or '',
                    ])

            elif line.startswith('INSERT INTO `country`'):
                for row in extract_rows(line):
                    if len(row) <= max(COUNTRY_COLS.values()):
                        continue
                    iso = (row[COUNTRY_COLS["iso_country"]] or '').strip()
                    name = (row[COUNTRY_COLS["name"]] or '').strip().rstrip('\r')
                    if iso:
                        countries.append([iso, name])

    airports_path = os.path.join(OUT_DIR, 'airports.csv')
    with open(airports_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['ident', 'name', 'latitude_deg', 'longitude_deg', 'municipality', 'iso_country'])
        writer.writerows(airports)
    print(f"airports.csv written: {len(airports)} airports")

    countries_path = os.path.join(OUT_DIR, 'countries.csv')
    with open(countries_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['iso_country', 'name'])
        writer.writerows(countries)
    print(f"countries.csv written: {len(countries)} countries")


if __name__ == '__main__':
    main()
