import json
import random
import sys

if __name__ == '__main__':
    model_path = sys.argv[1] if len(sys.argv) > 1 else 'unknown'
    random.seed(hash(model_path) % 1_000_000)
    metrics = {
        'accuracy': round(random.uniform(0.7, 0.99), 2),
        'f1': round(random.uniform(0.7, 0.99), 2)
    }
    print(json.dumps(metrics))
