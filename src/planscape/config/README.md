# config
These files are used to configure data used to populate options in the frontend. Each configuration json file in use has a corresponding python file which is called to validate the json structure.

## Config Descriptions

### boundary.json
This file configures the options that populate the Boundaries menu in the map control panel. Each entry has the following values:

            { 
            "boundary_name": "The name of the boundary",
            "display_name": "The display name that represents the boundary in the map control panel",
            "vector_name": "The name of the boundary vector in the geoserver",
            "filepath": "Unused, being deprecated",
            "source_srs": "Unused, being deprecated",
            "geometry_type": "Unused, being deprecated",
            "shape_name": "The key used to index each feature name in the boundary vector"
            }

### conditions
This file configures the options that populate the Conditions menu in the map control panel. Each region has its own set of conditions. Conditions are organzed into Pillars, Elements, and Metrics. Pillars are composed of Elements, which are in turn composed of Metrics. Entries have the following structure: 

    {
      "region_name": "The name of the region",
      "display_name": "The display name that represents the region",
      "region_geoserver_name": "The workspace name for the region in geoserver",
      "raw_data": "Whether or not raw data is available for the region",
      "translated_data": "Whether or not translated data is available for the region",
      "future_data": "Whether or not future data is available for the region",
      "pillars": [
        {
          "pillar_name": "The name of the Pillar",
          "display": "Whether or not the Pillar is displayed",
          "display_name": "The display name which represents the Pillar in the map control panel",
          "elements": [
            {
              "element_name": "The name of the Element",
              "display": "Whether or not the element is displayed",
              "display_name": "The display name which represents the Element in the map control panel",
              "metrics": [
                {
                  "display_name": "The display name which represents the Metric in the map control panel",
                  "data_provider": "The data provider of the metric (to be displayed in the info card"),
                  "data_units": "The data units of the metric (to be displayed in the info card"),
                  "max_value": "The maximum value of the metric (to be displayed in the info card)",
                  "metric_name": "The name of the Metric",
                  "min_value": "The minimum value of the metric (to be displayed in the info card)"
                  "raw_data_download_path": "The geoserver download path to the Metric raw tiff file (linked in the info card)",
                  "raw_layer": "The name of the layer in the geoserver",
                  "reference_link": "RRK reference link (to be linked in the info card)",
                  "source": "The source text (to be displayed in the info card)",
                  "source_link": "The source link (to be linked in the info card)",
                },
              ]
            },
          ]
        },
      ]
    }

### treatment_goals
This file configures the treatment goal options which populate the Scenario configurations page. Each region has its own set of treatment goals. Each treatment goal has its own set of categories, which in turn have their own set of questions. Each question has a text, priorities, and weights. The priorities are metrics and each weight in a list for a question corresponds to the priority with the same index. (e.g for priority: ['priority_1', 'priority_2'], weight: [1,2], 'priority_1' has weight 1 and 'priority_2' has weight 2). The name for each metric must be unique in the region. "scenario_output_fields_paths" is a dictionary with a list of the metrics that forsys will generate outputs for (used to populate the charts in the scenario results tab), as well as a list of the corresponding pillars and elements for those metrics. This is used to get the information for these metrics (e.g display_name, data_units) without needing to check every single metric for a region. scenario_output_fields_paths["metrics"] is used to populate the scenario_output_fields value for a scenario configuration on the backend. Each entry has the following structure:

    {
    "regions": [
      {
        "region_name": "The name of the region",
        "treatment_goals": [
          {
            "category_name": "The name of the category",
            "questions": [
                  {
              "long_question_text": "Long form of question that appears on mouse hover in scenario configuration page",
              "short_question_text": "Short form of text that appears by default in scenario configuration page",
              "scenario_priorities": [
                "The priorities used as inputs for forsys to answer the treatment goal question"
              ],
              "weights": ["The weights for the scenario_priorities associated with the question" ],
              "scenario_output_fields_paths":  {
                "pillars": [
                  "The pillars of the metrics"
                ],
                "elements": [
                  "The elements of the metrics"
                ],
                "metrics": [
                  "The metrics that the forsys results will provide data for"
                ]
              },
              "stand_thresholds": [
                "Strings that can be fed directly into forsys to represent certain thresholds"
              ],
              "global_thresholds": [ "Strings that can be fed directly into forsys to represent certain thresholds"]
            },
              ]
            },
          ]
        },
      ]
    }