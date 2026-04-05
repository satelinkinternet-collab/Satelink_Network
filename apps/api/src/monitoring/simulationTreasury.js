// src/services/simulationTreasury.js

let balance = 0;

export function getBalance() {
    return balance;
}

export function deposit(amount) {
    if (typeof amount !== 'number' || !isFinite(amount) || amount <= 0) {
        throw new Error("Deposit amount must be a finite positive number");
    }
    balance += amount;
    return { ok: true, balance };
}

export function withdraw(amount) {
    if (typeof amount !== 'number' || !isFinite(amount) || amount <= 0) {
        throw new Error("Withdraw amount must be a finite positive number");
    }
    if (balance < amount) {
        return { ok: false, error: "Insufficient funds in simulation treasury" };
    }
    balance -= amount;
    return { ok: true, balance };
}
