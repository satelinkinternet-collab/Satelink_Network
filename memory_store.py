import json
import os

MEMORY_FILE = "agent_memory.json"

def load_memory():
    if not os.path.exists(MEMORY_FILE):
        return []
    with open(MEMORY_FILE, "r") as f:
        return json.load(f)

def save_memory(memory):
    with open(MEMORY_FILE, "w") as f:
        json.dump(memory, f, indent=2)

def add_entry(task, result):
    memory = load_memory()
    memory.append({"task": task, "result": result[-500:]})
    save_memory(memory)

def get_context():
    memory = load_memory()
    return "\n".join([f"{m['task']} -> {m['result']}" for m in memory[-5:]])
