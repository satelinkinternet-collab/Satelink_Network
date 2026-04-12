import subprocess
import time
import threading

def run(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True).stdout

# 🧠 coder agent
def coder(task):
    print("\n👨‍💻 CODER running...\n")
    return run(f'aider --yes --no-pretty --model ollama/deepseek-coder -m "{task}"')

# 🕵️ reviewer agent
def reviewer():
    print("\n🕵️ REVIEWER checking...\n")
    return run('ollama run mixtral "Review latest code changes. Find bugs or missing logic."')

# 🧪 tester agent
def tester():
    print("\n🧪 TESTER running...\n")
    return run("npm test || pytest || echo 'no tests found'")

# 🔁 auto fix
def fixer():
    print("\n🔧 FIXER running...\n")
    return run('aider --yes --no-pretty --model ollama/codestral -m "Fix all failing tests and issues safely"')

# ⚡ parallel execution
def parallel_review_and_test():
    review_result = ""
    test_result = ""

    def run_review():
        nonlocal review_result
        review_result = reviewer()

    def run_test():
        nonlocal test_result
        test_result = tester()

    t1 = threading.Thread(target=run_review)
    t2 = threading.Thread(target=run_test)

    t1.start()
    t2.start()

    t1.join()
    t2.join()

    return review_result, test_result

# 🧠 main loop
def loop(task):
    iteration = 0

    while True:
        iteration += 1
        print(f"\n🚀 ITERATION {iteration}\n")

        # coder
        code_output = coder(task)
        print(code_output)

        # parallel reviewer + tester
        review, test = parallel_review_and_test()
        print("\n🕵️ REVIEW RESULT:\n", review)
        print("\n🧪 TEST RESULT:\n", test)

        # check failures
        if "error" in review.lower() or "fail" in test.lower():
            print("\n⚠️ Issues found → fixing...\n")
            fix_output = fixer()
            print(fix_output)

            task += " fix all remaining issues properly"
        else:
            print("\n✅ SYSTEM STABLE — TASK COMPLETE\n")
            break

        time.sleep(2)

# 🧠 daemon mode
def daemon():
    while True:
        task = input("\n🧠 Enter new task (or 'exit'): ")
        if task.lower() == "exit":
            break
        loop(task)

if __name__ == "__main__":
    print("\n🔥 GOD AGENT STARTED (autonomous mode)\n")
    daemon()
