const express = require("express");
const {
    MercadoPagoConfig,
    Preference,
    Payment
} = require("mercadopago");

require("dotenv").config();
const path = require("path");

const app = express();
app.use(express.json());
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "index.html"));
});

app.get("/style.css", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "style.css"));
});

app.get("/script.js", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "script.js"));
});


const token = process.env.MP_ACCESS_TOKEN;

if (!token) {
    console.error("Falta MP_ACCESS_TOKEN en el archivo .env");
    process.exit(1);
}

const client = new MercadoPagoConfig({
    accessToken: token
});

const preference = new Preference(client);
const payment = new Payment(client);



app.post("/crear-pago", async (req, res) => {
    try {
        
const resultado = await preference.create({
    body: {
        items: [
            {
                id: "enie-premium",
                title: "Enie Premium - Compra única",
                quantity: 1,
                unit_price: 1,
                currency_id: "ARS"
            }
        ],
        back_urls: {
            success: "https://www.mercadopago.com.ar",
            failure: "https://www.mercadopago.com.ar",
            pending: "https://www.mercadopago.com.ar"
        }
    }
});


        res.json({
            checkout_url: resultado.init_point
        });
    } catch (error) {
        console.error("Error creando el pago:", error.message);
        res.status(500).json({
            error: "No se pudo crear el pago."
        });
    }
});



app.get("/pago-exitoso", (req, res) => {
    const paymentId = req.query.payment_id;

    if (!paymentId) {
        return res.redirect("/");
    }

    res.redirect("/?payment_id=" + encodeURIComponent(paymentId));
});

app.get("/pago-fallido", (req, res) => {
    res.send("El pago no se completó.");
});

app.get("/pago-pendiente", (req, res) => {
    res.send("El pago está pendiente de confirmación.");
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Servidor de Enie activo en http://localhost:3000");
});

