
const result = document.getElementById("result");
const previous = document.getElementById("previous");
const scientificButtons = document.getElementById("scientificButtons");

let expression = "";
let finished = false;

let premiumDemo = localStorage.getItem("eniePremium") === "true";

const app = document.querySelector(".app");
const premiumBtn = document.getElementById("premiumBtn");
const premiumCardBtn = document.getElementById("premiumCardBtn");

function updateMode() {
    app.classList.toggle("free-mode", !premiumDemo);
    app.classList.toggle("premium-mode", premiumDemo);

    scientificButtons.hidden = !premiumDemo;

    premiumBtn.textContent = premiumDemo ? "Volver a Gratis" : "♛ PRO";
    premiumCardBtn.textContent = premiumDemo ? "Premium activo" : "Ver PRO";
}

async function comprarPremium() {
    try {
        premiumBtn.disabled = true;
        premiumCardBtn.disabled = true;

        const respuesta = await fetch("/crear-pago", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const datos = await respuesta.json();

        if (!respuesta.ok || !datos.checkout_url) {
            throw new Error(datos.error || "No se pudo crear el pago.");
        }

        window.location.href = datos.checkout_url;

    } catch (error) {
        console.error(error);
        alert("No se pudo abrir Mercado Pago. Revisá que el servidor esté funcionando.");
    } finally {
        premiumBtn.disabled = false;
        premiumCardBtn.disabled = false;
    }
}

premiumBtn.addEventListener("click", comprarPremium);
premiumCardBtn.addEventListener("click", comprarPremium);



// Mostrar símbolos amigables sin cambiar la expresión matemática interna.
function formatExpression(text) {
    return text
        .replace(/sqrt\(/g, "√(")
        .replace(/\*\*/g, "^")
        .replace(/\*/g, "×")
        .replace(/\//g, "÷")
        .replace(/\./g, ",");
}

function updateDisplay() {
    result.textContent = formatExpression(expression || "0");
}

function clearAll() {
    expression = "";
    previous.textContent = "";
    finished = false;
    updateDisplay();
}

function addValue(value) {
    if (finished) {
        if (/^[0-9.(]$/.test(value) || /^[a-z]/i.test(value)) {
            expression = "";
            previous.textContent = "";
        }
        finished = false;
    }

    if (expression.length >= 150) return;

    if (value === "**") {
        if (!expression || /[+\-*/.(]$/.test(expression)) return;
        expression += "**";
        updateDisplay();
        return;
    }

    if (value === ")") {
        const opens = (expression.match(/\(/g) || []).length;
        const closes = (expression.match(/\)/g) || []).length;

        if (opens <= closes || /[+\-*/.(]$/.test(expression)) return;
    }

    if (value === ".") {
        const lastNumber = expression.split(/[+\-*/()]/).pop();
        if (lastNumber.includes(".")) return;
        if (!lastNumber) expression += "0";
    }

    const last = expression.slice(-1);

    // Multiplicación implícita: 2(3+4), 2sin(30), etc.
    if (
        (/[0-9)]/.test(last) && value === "(") ||
        (last === ")" && /^[0-9.]$/.test(value)) ||
        (/[0-9)]/.test(last) && /^[a-z]/i.test(value))
    ) {
        expression += "*";
    }

    if (/^[+*/]$/.test(value) && /[+*/]$/.test(expression)) {
        expression = expression.slice(0, -1) + value;
        updateDisplay();
        return;
    }

    expression += value;
    updateDisplay();
}

function backspace() {
    if (finished) {
        clearAll();
        return;
    }

    const functionMatch = expression.match(/(sqrt|sin|cos|tan|log|ln)\($/);

    if (functionMatch) {
        expression = expression.slice(0, -functionMatch[0].length);
    } else {
        expression = expression.slice(0, -1);
    }

    updateDisplay();
}

function calculate() {
    if (!expression.trim()) return;

    try {
        let exp = expression.replace(/\s+/g, "");

        const opens = (exp.match(/\(/g) || []).length;
        const closes = (exp.match(/\)/g) || []).length;

        if (closes > opens) throw Error("Paréntesis incorrectos");

        // Completar automáticamente los paréntesis abiertos.
        exp += ")".repeat(opens - closes);

        // Permitir expresiones que terminen en un paréntesis,
        // pero no operaciones incompletas.
        if (/[+\-*/.]$/.test(exp)) throw Error("Expresión incompleta");

        if (!/^[0-9+\-*/().a-z]+$/i.test(exp)) {
            throw Error("Expresión no válida");
        }

        const names = exp.match(/[a-z]+/gi) || [];
        const allowed = ["sqrt", "sin", "cos", "tan", "log", "ln"];

        if (names.some(name => !allowed.includes(name))) {
            throw Error("Función desconocida");
        }

        const answer = Function(
            "sqrt", "sin", "cos", "tan", "log", "ln",
            '"use strict"; return (' + exp + ');'
        )(
            Math.sqrt,
            n => Math.sin(n * Math.PI / 180),
            n => Math.cos(n * Math.PI / 180),
            n => Math.tan(n * Math.PI / 180),
            Math.log10,
            Math.log
        );

        if (!Number.isFinite(answer)) {
            throw Error("Resultado no válido");
        }

        previous.textContent = formatExpression(expression) + " =";
        expression = String(Number(answer.toPrecision(12)));
        finished = true;
        updateDisplay();

    } catch (error) {
        // El error no debe conservar la expresión anterior.
        expression = "";
        finished = false;
        previous.textContent = "";
        result.textContent = "Error";
    }
}

function scientific(action) {

    if (["sqrt", "sin", "cos", "tan", "log", "ln"].includes(action)) {
        if (finished) {
            expression = "";
            previous.textContent = "";
            finished = false;
        }

        if (expression && /[0-9)]$/.test(expression)) {
            expression += "*";
        }

        expression += action + "(";
        updateDisplay();
        return;
    }

    if (action === "square") {
        if (!expression) return;
        expression = "(" + expression + ")**2";
        finished = false;
        updateDisplay();
    } else if (action === "power") {
        addValue("**");
    } else if (action === "open") {
        addValue("(");
    } else if (action === "close") {
        addValue(")");
    } else if (action === "pi") {
    addValue("3.14");
} else if (action === "e") {
    addValue("2.718281828");
}
}

function changeSign() {
    if (!expression) return;

    if (/^-?\d+(?:\.\d+)?$/.test(expression)) {
        expression = String(-Number(expression));
        finished = false;
        updateDisplay();
    }
}

function percentage() {
    const match = expression.match(/(\d+(?:\.\d*)?|\.\d+)$/);
    if (!match) return;

    expression =
        expression.slice(0, -match[0].length) +
        String(Number(match[0]) / 100);

    finished = false;
    updateDisplay();
}

// IMPORTANTE: solo botones normales, sin los científicos.
document.querySelectorAll(".buttons > button").forEach(button => {
    button.addEventListener("click", () => {
        const value = button.dataset.value;
        const action = button.dataset.action;

        if (value !== undefined) {
            addValue(value);
            return;
        }

        switch (action) {
            case "clear": clearAll(); break;
            case "backspace": backspace(); break;
            case "decimal": addValue("."); break;
            case "equals": calculate(); break;
            case "sign": changeSign(); break;
            case "percent": percentage(); break;
        }
    });
});

// Los científicos se procesan una sola vez.
scientificButtons.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
        scientific(button.dataset.value);
    });
});

function showPremium() {
    alert("Enie Premium: las compras deben verificarse antes de activar el acceso.");
}


document.addEventListener("keydown", event => {
    if (/^[0-9.]$/.test(event.key)) addValue(event.key);
    else if (["+", "-", "*", "/"].includes(event.key)) addValue(event.key);
    else if (event.key === "(" || event.key === ")") addValue(event.key);
    else if (event.key === "^") addValue("**");
    else if (event.key === "Enter" || event.key === "=") {
        event.preventDefault();
        calculate();
    } else if (event.key === "Backspace") {
        backspace();
    } else if (event.key === "Escape") {
        clearAll();
    } else if (event.key === "%") {
        percentage();
    }
});

async function verificarCompra() {
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get("payment_id") || params.get("collection_id");

    if (!paymentId) return;

    try {
        const respuesta = await fetch(
            `/verificar-pago/${encodeURIComponent(paymentId)}`
        );
        const datos = await respuesta.json();

        if (respuesta.ok && datos.aprobado === true) {
            localStorage.setItem("eniePremium", "true");
            premiumDemo = true;
            updateMode();
            alert("¡Premium activado correctamente!");
        } else {
            alert("El pago todavía no figura aprobado. Si ya pagaste, volvé a comprobarlo en unos segundos.");
        }
    } catch (error) {
        alert("No pudimos verificar el pago. Intentá nuevamente.");
    } finally {
        window.history.replaceState({}, document.title, "/");
    }
}

verificarCompra();

updateMode();
updateDisplay();

