import subprocess
import time
from memory_store import add_entry, get_context

def run(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True).stdout

# 🧠 Planner (uses mixtral)
def plan(task):
    context = get_context()
    prompt = f"""
You are a senior software planner.

Break this task into clear step-by-step plan.

Task:
{task}

Context:
{context}

Return numbered steps only.
"""
    return run(f'ollama run mixtral "{prompt}"')

# ⚙️ Executor (uses deepseek)
def execute(step):
    return run(f'aider --yes --no-pretty --model ollama/deepseek-coder -m "{step}"')

# 🕵️ Critic (uses mixtral)
def critique():
    prompt = "Check latest code changes. Are there bugs or missing parts? Answer YES/NO and explain."
    return run(f'ollama run mixtral "{prompt}"')

def devin_loop(task):
    print("\n🧠 PLANNING...\n")
    steps = plan(task)
    print(steps)

    step_list = [s for s in steps.split("\n") if s.strip()]

    for i, step in enumerate(step_list):
        print(f"\n⚡ EXECUTING STEP {i+1}: {step}\n")

        result = execute(step)
        print(result)

        add_entry(step, result)

        review = critique()
        print("\n🕵️ CRITIC:\n", review)

        if "yes" in review.lower():
            print("\n🔁 Fixing issues...")
            fix = execute(step + " fix all issues properly")
            print(fix)
            add_entry(step + " fix", fix)

        time.sleep(1)

    print("\n✅ TASK COMPLETED")

if __name__ == "__main__":
    task = input("Enter your task: ")
    devin_loop(task)
