import subprocess
import time

def run(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True).stdout

def loop(task):
    while True:
        print("\n🔁 Autonomous cycle...\n")

        plan = run(f'ollama run mixtral "Plan steps for: {task}"')
        print(plan)

        exec_out = run(f'aider --yes --model ollama/deepseek-coder -m "{task}"')
        print(exec_out)

        review = run(f'ollama run mixtral "Is this complete and correct? yes/no"')
        print(review)

        if "yes" in review.lower():
            print("\n✅ DONE")
            break

        task += " fix remaining issues"
        time.sleep(2)

if __name__ == "__main__":
    task = input("Task: ")
    loop(task)
