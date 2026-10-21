# Model files go here

This folder is intentionally empty. Put your trained assets here when your dataset/training is ready:

| File | What it is |
|------|------------|
| `resnet50_cosmetics.pt` | Your trained torchvision ResNet50 (state_dict) with a final `Linear(2048, N)` layer |
| `labels.json` | `["authentic", "counterfeit"]` - order must match the model's output indices |
| `easyocr/` | (auto-created) EasyOCR downloads language models here on first run |

Full instructions: `docs/MODEL_INTEGRATION.md`. Large files are git-ignored by default (use Git LFS or a model host).
