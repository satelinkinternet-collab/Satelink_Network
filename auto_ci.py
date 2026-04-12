import subprocess
import time

def run(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True).stdout

def test():
    return run("npm test || pytest || echo 'no tests'")

def fix():
    return run('aider --yes --model ollama/deepseek-coder -m "Fix failing tests"')

def loop():
    for i in range(5):
        print(f"\n🔁 CI Iteration {i+1}")
        result = test()
        print(result)

        if "fail" in result.lower() or "error" in result.lower():
            print("⚠️ Fixing...")
            print(fix())
        else:
            print("✅ Tests passed")
            break

        time.sleep(1)

if __name__ == "__main__":
    loop()
