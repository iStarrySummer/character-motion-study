window.FAVE_STUDY = {
  "config": {
    "study_name": "Character Motion Study",
    "version": "v20",
    "video_rules": {
      "mute_all_videos": true,
      "require_uniform_resolution": "320p",
      "part_a_watch_completion_required_pct": 100
    },
    "SETTING_DIR": {
      "setting_01": "setting_01__original_audio__lora_off__noprompt",
      "setting_03": "setting_03__tts_original_guided__lora_off__noprompt",
      "setting_04": "setting_04__tts_original_guided__lora_off__prompt",
      "setting_05": "setting_05__tts_neutral_reference__lora_off__noprompt",
      "setting_07": "setting_07__tts_original_guided__lora_on__noprompt"
    },
    "randomization_rules": {
      "candidate_side": "Randomize within each comparison type, with a 7/8 split for the two sides."
    },
    "questions": {
      "PartA_Pairwise": {
        "q1_diff": {
          "field": "diff_score",
          "required": true,
          "label_zh": "A 和 B 的头部运动和面部表情像不像？",
          "label_en": "How similar are A and B in their head movements and facial expressions?",
          "options": [
            {
              "value": 0,
              "label_zh": "基本一致",
              "label_en": "Nearly identical"
            },
            {
              "value": 1,
              "label_zh": "有肉眼可见的差别",
              "label_en": "Visibly different"
            }
          ]
        },
        "q2_choice": {
          "field": "choice_raw",
          "required": true,
          "label_zh": "哪一个候选视频的头部运动和面部表情更像参考视频？",
          "label_en": "Which candidate more closely matches the head movements and facial expressions in the reference video?",
          "options": [
            {
              "value": "A",
              "label_zh": "选择 A",
              "label_en": "Choose A"
            },
            {
              "value": "B",
              "label_zh": "选择 B",
              "label_en": "Choose B"
            }
          ],
          "show_when": "diff_score == 1"
        },
        "q3_reasons_optional": {
          "field": "reason_tags",
          "required": false,
          "show_when": "choice_raw in ['A', 'B']",
          "multi_select": true,
          "label_zh": "你为什么选择这位候选人？",
          "label_en": "Why did you choose this candidate?",
          "options": [
            {
              "value": "head_motion",
              "label_zh": "头部运动更相似",
              "label_en": "More similar head movements"
            },
            {
              "value": "brow_motion",
              "label_zh": "眉毛动作（包括皱眉时的纹路）更相似",
              "label_en": "More similar brow movements and creases"
            },
            {
              "value": "eye_motion",
              "label_zh": "眼部动作更相似",
              "label_en": "More similar eye movements"
            },
            {
              "value": "mouth_motion",
              "label_zh": "嘴部运动更相似",
              "label_en": "More similar mouth movements"
            }
          ]
        },
        "q2_reference": {
          "field": "both_resemble_reference",
          "required": true,
          "show_when": "diff_score == 0",
          "label_en": "Do both candidates resemble the reference in their head movements and facial expressions?",
          "label_zh": "两个候选视频的头部运动和面部表情都像中间的参考视频吗？",
          "options": [
            {
              "value": "yes",
              "label_en": "Yes",
              "label_zh": "是"
            },
            {
              "value": "no",
              "label_en": "No",
              "label_zh": "否"
            }
          ]
        }
      }
    }
  },
  "form": {
    "form_id": "Single",
    "total_trials": 30,
    "trials": [
      {
        "form_id": "Single",
        "order_index": 1,
        "item_id": "S20_01",
        "part": "PartA_Pairwise",
        "role": "core",
        "task": "lora",
        "character": "Sheldon",
        "scene_id": "S7E13_453",
        "base_setting": "setting_03",
        "test_setting": "setting_07",
        "round": 1,
        "audio_comparison": null,
        "lora_weights": "Sheldon"
      },
      {
        "form_id": "Single",
        "order_index": 2,
        "item_id": "S20_02",
        "part": "PartA_Pairwise",
        "role": "core",
        "task": "audio",
        "character": "Penny",
        "scene_id": "S10E11_399",
        "base_setting": "setting_01",
        "test_setting": "setting_05",
        "round": 1,
        "audio_comparison": "TTS-N",
        "lora_weights": null
      },
      {
        "form_id": "Single",
        "order_index": 3,
        "item_id": "S20_03",
        "part": "PartA_Pairwise",
        "role": "core",
        "task": "audio",
        "character": "Leonard",
        "scene_id": "S3E18_421",
        "base_setting": "setting_01",
        "test_setting": "setting_05",
        "round": 1,
        "audio_comparison": "TTS-N",
        "lora_weights": null
      },
      {
        "form_id": "Single",
        "order_index": 4,
        "item_id": "S20_04",
        "part": "PartA_Pairwise",
        "role": "core",
        "task": "lora",
        "character": "Penny",
        "scene_id": "S2E7_418",
        "base_setting": "setting_03",
        "test_setting": "setting_07",
        "round": 1,
        "audio_comparison": null,
        "lora_weights": "Penny"
      },
      {
        "form_id": "Single",
        "order_index": 5,
        "item_id": "S20_05",
        "part": "PartA_Pairwise",
        "role": "core",
        "task": "lora",
        "character": "Leonard",
        "scene_id": "S2E9_233",
        "base_setting": "setting_03",
        "test_setting": "setting_07",
        "round": 1,
        "audio_comparison": null,
        "lora_weights": "Sheldon"
      },
      {
        "form_id": "Single",
        "order_index": 6,
        "item_id": "S20_06",
        "part": "PartA_Pairwise",
        "role": "core",
        "task": "audio",
        "character": "Sheldon",
        "scene_id": "S2E21_167",
        "base_setting": "setting_01",
        "test_setting": "setting_03",
        "round": 1,
        "audio_comparison": "TTS-E",
        "lora_weights": null
      },
      {
        "form_id": "Single",
        "order_index": 7,
        "item_id": "S20_07",
        "part": "PartA_Pairwise",
        "role": "core",
        "task": "audio",
        "character": "Leonard",
        "scene_id": "S1E13_30",
        "base_setting": "setting_01",
        "test_setting": "setting_05",
        "round": 2,
        "audio_comparison": "TTS-N",
        "lora_weights": null
      },
      {
        "form_id": "Single",
        "order_index": 8,
        "item_id": "S20_08",
        "part": "PartA_Pairwise",
        "role": "core",
        "task": "lora",
        "character": "Sheldon",
        "scene_id": "S5E10_302",
        "base_setting": "setting_03",
        "test_setting": "setting_07",
        "round": 2,
        "audio_comparison": null,
        "lora_weights": "Sheldon"
      },
      {
        "form_id": "Single",
        "order_index": 9,
        "item_id": "S20_09",
        "part": "PartA_Pairwise",
        "role": "core",
        "task": "audio",
        "character": "Penny",
        "scene_id": "S8E4_110",
        "base_setting": "setting_01",
        "test_setting": "setting_05",
        "round": 2,
        "audio_comparison": "TTS-N",
        "lora_weights": null
      },
      {
        "form_id": "Single",
        "order_index": 10,
        "item_id": "S20_10",
        "part": "PartA_Pairwise",
        "role": "core",
        "task": "audio",
        "character": "Sheldon",
        "scene_id": "S9E17_403",
        "base_setting": "setting_01",
        "test_setting": "setting_03",
        "round": 2,
        "audio_comparison": "TTS-E",
        "lora_weights": null
      },
      {
        "form_id": "Single",
        "order_index": 11,
        "item_id": "S20_11",
        "part": "PartA_Pairwise",
        "role": "core",
        "task": "lora",
        "character": "Penny",
        "scene_id": "S8E16_67",
        "base_setting": "setting_03",
        "test_setting": "setting_07",
        "round": 2,
        "audio_comparison": null,
        "lora_weights": "Penny"
      },
      {
        "form_id": "Single",
        "order_index": 12,
        "item_id": "S20_12",
        "part": "PartA_Pairwise",
        "role": "core",
        "task": "lora",
        "character": "Leonard",
        "scene_id": "S3E7_52",
        "base_setting": "setting_03",
        "test_setting": "setting_07",
        "round": 2,
        "audio_comparison": null,
        "lora_weights": "Sheldon"
      },
      {
        "form_id": "Single",
        "order_index": 13,
        "item_id": "S20_13",
        "part": "PartA_Pairwise",
        "role": "core",
        "task": "audio",
        "character": "Sheldon",
        "scene_id": "S5E20_360",
        "base_setting": "setting_01",
        "test_setting": "setting_03",
        "round": 3,
        "audio_comparison": "TTS-E",
        "lora_weights": null
      },
      {
        "form_id": "Single",
        "order_index": 14,
        "item_id": "S20_14",
        "part": "PartA_Pairwise",
        "role": "core",
        "task": "lora",
        "character": "Leonard",
        "scene_id": "S2E11_429",
        "base_setting": "setting_03",
        "test_setting": "setting_07",
        "round": 3,
        "audio_comparison": null,
        "lora_weights": "Sheldon"
      },
      {
        "form_id": "Single",
        "order_index": 15,
        "item_id": "S20_15",
        "part": "PartA_Pairwise",
        "role": "core",
        "task": "lora",
        "character": "Penny",
        "scene_id": "S10E11_399",
        "base_setting": "setting_03",
        "test_setting": "setting_07",
        "round": 3,
        "audio_comparison": null,
        "lora_weights": "Penny"
      },
      {
        "form_id": "Single",
        "order_index": 16,
        "item_id": "S20_16",
        "part": "PartA_Pairwise",
        "role": "core",
        "task": "audio",
        "character": "Leonard",
        "scene_id": "S3E14_236",
        "base_setting": "setting_01",
        "test_setting": "setting_05",
        "round": 3,
        "audio_comparison": "TTS-N",
        "lora_weights": null
      },
      {
        "form_id": "Single",
        "order_index": 17,
        "item_id": "S20_17",
        "part": "PartA_Pairwise",
        "role": "core",
        "task": "audio",
        "character": "Penny",
        "scene_id": "S2E21_407",
        "base_setting": "setting_01",
        "test_setting": "setting_05",
        "round": 3,
        "audio_comparison": "TTS-N",
        "lora_weights": null
      },
      {
        "form_id": "Single",
        "order_index": 18,
        "item_id": "S20_18",
        "part": "PartA_Pairwise",
        "role": "core",
        "task": "lora",
        "character": "Sheldon",
        "scene_id": "S3E6_431",
        "base_setting": "setting_03",
        "test_setting": "setting_07",
        "round": 3,
        "audio_comparison": null,
        "lora_weights": "Sheldon"
      },
      {
        "form_id": "Single",
        "order_index": 19,
        "item_id": "S20_19",
        "part": "PartA_Pairwise",
        "role": "core",
        "task": "lora",
        "character": "Penny",
        "scene_id": "S8E1_89",
        "base_setting": "setting_03",
        "test_setting": "setting_07",
        "round": 4,
        "audio_comparison": null,
        "lora_weights": "Penny"
      },
      {
        "form_id": "Single",
        "order_index": 20,
        "item_id": "S20_20",
        "part": "PartA_Pairwise",
        "role": "core",
        "task": "audio",
        "character": "Sheldon",
        "scene_id": "S6E2_401",
        "base_setting": "setting_01",
        "test_setting": "setting_03",
        "round": 4,
        "audio_comparison": "TTS-E",
        "lora_weights": null
      },
      {
        "form_id": "Single",
        "order_index": 21,
        "item_id": "S20_21",
        "part": "PartA_Pairwise",
        "role": "core",
        "task": "lora",
        "character": "Leonard",
        "scene_id": "S1E13_30",
        "base_setting": "setting_03",
        "test_setting": "setting_07",
        "round": 4,
        "audio_comparison": null,
        "lora_weights": "Sheldon"
      },
      {
        "form_id": "Single",
        "order_index": 22,
        "item_id": "S20_22",
        "part": "PartA_Pairwise",
        "role": "core",
        "task": "lora",
        "character": "Sheldon",
        "scene_id": "S9E17_403",
        "base_setting": "setting_03",
        "test_setting": "setting_07",
        "round": 4,
        "audio_comparison": null,
        "lora_weights": "Sheldon"
      },
      {
        "form_id": "Single",
        "order_index": 23,
        "item_id": "S20_23",
        "part": "PartA_Pairwise",
        "role": "core",
        "task": "audio",
        "character": "Leonard",
        "scene_id": "S3E7_52",
        "base_setting": "setting_01",
        "test_setting": "setting_05",
        "round": 4,
        "audio_comparison": "TTS-N",
        "lora_weights": null
      },
      {
        "form_id": "Single",
        "order_index": 24,
        "item_id": "S20_24",
        "part": "PartA_Pairwise",
        "role": "core",
        "task": "audio",
        "character": "Penny",
        "scene_id": "S8E16_67",
        "base_setting": "setting_01",
        "test_setting": "setting_05",
        "round": 4,
        "audio_comparison": "TTS-N",
        "lora_weights": null
      },
      {
        "form_id": "Single",
        "order_index": 25,
        "item_id": "S20_25",
        "part": "PartA_Pairwise",
        "role": "core",
        "task": "lora",
        "character": "Leonard",
        "scene_id": "S3E18_421",
        "base_setting": "setting_03",
        "test_setting": "setting_07",
        "round": 5,
        "audio_comparison": null,
        "lora_weights": "Sheldon"
      },
      {
        "form_id": "Single",
        "order_index": 26,
        "item_id": "S20_26",
        "part": "PartA_Pairwise",
        "role": "core",
        "task": "lora",
        "character": "Penny",
        "scene_id": "S10E7_444",
        "base_setting": "setting_03",
        "test_setting": "setting_07",
        "round": 5,
        "audio_comparison": null,
        "lora_weights": "Penny"
      },
      {
        "form_id": "Single",
        "order_index": 27,
        "item_id": "S20_27",
        "part": "PartA_Pairwise",
        "role": "core",
        "task": "audio",
        "character": "Sheldon",
        "scene_id": "S9E17_369",
        "base_setting": "setting_01",
        "test_setting": "setting_03",
        "round": 5,
        "audio_comparison": "TTS-E",
        "lora_weights": null
      },
      {
        "form_id": "Single",
        "order_index": 28,
        "item_id": "S20_28",
        "part": "PartA_Pairwise",
        "role": "core",
        "task": "audio",
        "character": "Penny",
        "scene_id": "S3E11_36",
        "base_setting": "setting_01",
        "test_setting": "setting_05",
        "round": 5,
        "audio_comparison": "TTS-N",
        "lora_weights": null
      },
      {
        "form_id": "Single",
        "order_index": 29,
        "item_id": "S20_29",
        "part": "PartA_Pairwise",
        "role": "core",
        "task": "lora",
        "character": "Sheldon",
        "scene_id": "S5E20_360",
        "base_setting": "setting_03",
        "test_setting": "setting_07",
        "round": 5,
        "audio_comparison": null,
        "lora_weights": "Sheldon"
      },
      {
        "form_id": "Single",
        "order_index": 30,
        "item_id": "S20_30",
        "part": "PartA_Pairwise",
        "role": "core",
        "task": "audio",
        "character": "Leonard",
        "scene_id": "S2E11_429",
        "base_setting": "setting_01",
        "test_setting": "setting_05",
        "round": 5,
        "audio_comparison": "TTS-N",
        "lora_weights": null
      }
    ]
  }
};
