import { Geometry } from "geojson";

// This is a small (51,032 acres) wooded area in Yosemite, near Sentinel Dome
// This can be used to create a planning area that can be processed in less than 30 seconds
export const geomYosemite: Geometry = {
    "coordinates": [
        [
            [
                [
                    -119.65779327,
                    37.710779973
                ],
                [
                    -119.710478955,
                    37.712069036
                ],
                [
                    -119.793037924,
                    37.612315309
                ],
                [
                    -119.631178844,
                    37.575734048
                ],
                [
                    -119.531239053,
                    37.666938478
                ],
                [
                    -119.65779327,
                    37.710779973
                ]
            ]
        ]
    ],
    "type": "MultiPolygon"
}
