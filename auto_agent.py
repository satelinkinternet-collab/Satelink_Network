import subprocess
import time

def run(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True)

def choose_model(task):
    task = task.lower()

    if "bug" in task or "error" in task or "fix" in task:
        return "ollama/mixtral"
    elif "implement" in task or "feature" in task or "refactor" in task:
        return "ollama/deepseek-coder"
    elif "explain" in task or "document" in task:
        return "ollama/gemma:7b"
    else:
        return "ollama/codestral"

def execute_task(model, task):
    print(f"\n⚡ Using model: {model}\n")

    cmd = f'aider --yes --model {model} -m "{task}"'
    return run(cmd)

def validate(output):
    if "error" in output.lower():
        return False
    return True

def autonomous_loop(task):
    for i in range(5):  # loop attempts
        print(f"\n🔁 Iteration {i+1}")

        model = choose_model(task)
        result = execute_task(model, task)

        print(result.stdout)

        if validate(result.stdout):
            print("\n✅ Task looks successful")
            break
        else:
            print("\n❌ Retrying with stronger model...")
            task += " fix errors and improve"

        time.sleep(1)

if __name__ == "__main__":
    task = input("Enter your task: ")
    autonomous_loop(task)
