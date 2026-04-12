import subprocess
import time
from memory_store import add_entry, get_context

def run(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True)

def choose_model(task):
    if "error" in task or "bug" in task:
        return "ollama/mixtral"
    elif "implement" in task or "feature" in task:
        return "ollama/deepseek-coder"
    else:
        return "ollama/gemma:7b"

def execute(model, task):
    context = get_context()
    full_task = f"{task}\n\nPrevious context:\n{context}"

    cmd = f'aider --yes --no-pretty --model {model} -m "{full_task}"'
    return run(cmd)

def loop(task):
    for i in range(6):
        print(f"\n🔁 Iteration {i+1}")

        model = choose_model(task)
        res = execute(model, task)

        print(res.stdout)

        add_entry(task, res.stdout)

        if "error" not in res.stdout.lower():
            print("✅ Done")
            break
        else:
            task += " fix properly without breaking anything"

        time.sleep(1)

if __name__ == "__main__":
    task = input("Task: ")
    loop(task)
