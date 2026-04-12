import subprocess
import time

def run(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True)

# 🧠 ask gemma4 for strategy
def ask_gemma(task):
    prompt = f"Analyze this task and suggest best approach:\\n{task}"
    res = subprocess.run(
        f'ollama run gemma4:latest "{prompt}"',
        shell=True,
        capture_output=True,
        text=True
    )
    return res.stdout.strip()

# ⚙️ run aider with model
def run_aider(model, task):
    print(f"\\n⚡ Running with {model}\\n")
    cmd = f'aider --yes --no-pretty --model {model} -m "{task}"'
    return run(cmd)

# 🔁 smart fallback loop
def smart_loop(task):
    for attempt in range(3):
        print(f"\\n🔁 Attempt {attempt+1}")

        # 🥇 try deepseek first
        res = run_aider("ollama/deepseek-coder", task)
        print(res.stdout)

        if "error" not in res.stdout.lower():
            print("\\n✅ Success with deepseek")
            return

        print("\\n⚠️ Deepseek failed, switching to codestral...")

        # 🥈 fallback to codestral
        res = run_aider("ollama/codestral", task)
        print(res.stdout)

        if "error" not in res.stdout.lower():
            print("\\n✅ Success with codestral")
            return

        print("\\n🧠 Asking gemma4 for help...")

        # 🧠 use gemma4 for reasoning
        advice = ask_gemma(task)
        print("\\nGemma4 advice:\\n", advice)

        task = task + "\\n\\nImprove based on this advice:\\n" + advice

        time.sleep(1)

    print("\\n❌ All attempts failed")

if __name__ == "__main__":
    task = input("Enter task: ")
    smart_loop(task)
