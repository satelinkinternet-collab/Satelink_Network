import subprocess

def run(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True).stdout

def coder(task):
    return run(f'aider --yes --model ollama/deepseek-coder -m "{task}"')

def reviewer():
    return run(f'ollama run mixtral "Review the latest code changes and find issues."')

def tester():
    return run(f'ollama run gemma:7b "Check if implementation is logically correct."')

def loop(task):
    print("\n👨‍💻 CODER")
    code_out = coder(task)
    print(code_out)

    print("\n🕵️ REVIEWER")
    review = reviewer()
    print(review)

    print("\n🧪 TESTER")
    test = tester()
    print(test)

    if "error" in review.lower() or "fail" in test.lower():
        print("\n🔁 Fixing issues...")
        loop(task + " fix all issues found")
    else:
        print("\n✅ System stable")

if __name__ == "__main__":
    task = input("Task: ")
    loop(task)
