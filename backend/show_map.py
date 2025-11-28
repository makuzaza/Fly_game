import folium
import os
from folium.plugins import Search

def showMap(coordinates, output_file='map.html'):
    if os.path.exists(output_file):
        print(f"Map '{output_file}' already exists. Skipping creation.")
        return
    map = folium.Map(location=[coordinates[0]['lat'], coordinates[0]['lng']], zoom_start=5)
    marker_group = folium.FeatureGroup(name="Airports")

    for airport in coordinates:
        marker = folium.Marker(
            location=[airport['lat'], airport['lng']],
            popup=f"{airport['name']}<br><b>{airport['ident']}</b><br>{airport['city']}, {airport['country']}",
            tooltip=airport['ident'],
            icon=folium.Icon(color='blue', icon='plane', prefix='fa')
        )

        marker.options['name'] = f"{airport['ident']} - {airport['name']} - {airport['city']}"
        marker.add_to(marker_group)

    marker_group.add_to(map)

    Search(
        layer=marker_group,
        search_label='name',
        placeholder='Search by name, city or ICAO code',
        collapsed=False,
        search_zoom=7,
        casesensitive=False
    ).add_to(map)

    map.save('map.html')