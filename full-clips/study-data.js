window.FAVE_STUDY = {
  "config": {
    "study_name": "Character Motion Study",
    "version": "four-v1",
    "video_rules": {
      "mute_all_videos": true,
      "require_uniform_resolution": "320p"
    },
    "SETTING_DIR": {
      "setting_01": "setting_01__original_audio__lora_off__noprompt",
      "setting_03": "setting_03__tts_original_guided__lora_off__noprompt",
      "setting_04": "setting_04__tts_original_guided__lora_off__prompt",
      "setting_05": "setting_05__tts_neutral_reference__lora_off__noprompt",
      "setting_07": "setting_07__tts_original_guided__lora_on__noprompt"
    },
    "randomization_rules": {
      "candidate_side": "Place the test setting on the left twice and on the right twice in random order."
    },
    "questions": {
      "PartA_Pairwise": {
        "choice": {
          "field": "choice_raw",
          "required": true,
          "label_zh": "对比头部、眉毛和嘴巴的动作，哪个候选视频更像中间的 GT 参考视频？",
          "label_en": "Which candidate’s head, eyebrow, and mouth movements are closer to the GT reference?",
          "options": [
            {
              "value": "A",
              "label_zh": "选择 A",
              "label_en": "Candidate A"
            },
            {
              "value": "B",
              "label_zh": "选择 B",
              "label_en": "Candidate B"
            }
          ]
        }
      }
    }
  },
  "form": {
    "form_id": "FullClips4",
    "total_trials": 4,
    "trials": [
      {
        "form_id": "FullClips4",
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
        "form_id": "FullClips4",
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
        "form_id": "FullClips4",
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
        "form_id": "FullClips4",
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
      }
    ]
  }
};
window.FULL_CLIPS = {
  "S20_05": {
    "src": "media/q5.mp4",
    "durations": [
      1.88,
      5.04,
      5.04
    ]
  },
  "S20_12": {
    "src": "media/q12.mp4",
    "durations": [
      1.52,
      5.04,
      5.04
    ]
  },
  "S20_16": {
    "src": "media/q16.mp4",
    "durations": [
      4.04,
      5.04,
      5.04
    ]
  },
  "S20_22": {
    "src": "media/q22.mp4",
    "durations": [
      1.28,
      5.04,
      5.04
    ]
  }
};
