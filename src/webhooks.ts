import express from "express";
import { WebhookRequest } from "./server";
import { stripe } from "./lib/stripe";
import Stripe from "stripe";
import { getPayloadClient } from "./get-payload";
import { Product } from "./payload-types";
import nodemailer from "nodemailer";
import { ReceiptEmailHtml } from "./components/emails/ReceiptEmail";

export const stripeWebhookHandler = async (req: express.Request, res: express.Response) => {
  const webhookRequest = req as any as WebhookRequest;
  const body = webhookRequest.rawBody;
  const signature = req.headers["stripe-signature"] || "";

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET || "");
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : "Unknown Error"}`);
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (!session?.metadata?.userId || !session?.metadata?.orderId) {
    return res.status(400).send(`Webhook Error: No user present in metadata`);
  }

  if (event.type === "checkout.session.completed") {
    const payload = await getPayloadClient();

    const { docs: users } = await payload.find({
      collection: "users",
      where: {
        id: {
          equals: session.metadata.userId,
        },
      },
    });

    const [user] = users;

    if (!user) return res.status(404).json({ error: "No such user exists." });

    const { docs: orders } = await payload.find({
      collection: "orders",
      depth: 2,
      where: {
        id: {
          equals: session.metadata.orderId,
        },
      },
    });

    const [order] = orders;

    if (!user) return res.status(404).json({ error: "No such order exists." });

    await payload.update({
      collection: "orders",
      data: {
        _isPaid: true,
      },
      where: {
        id: {
          equals: session.metadata.orderId,
        },
      },
    });

    // send receipt
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: "parthgenius.gps@gmail.com",
        pass: "szktlhaxuvxzehco",
      },
    });

    const mailOptions = {
      from: "HippoMarket <rauvishnu7@gmail.com>",
      to: user.email,
      subject: "Thanks for your order! This is your receipt.",
      text: "Email content",
      html: ReceiptEmailHtml({
        date: new Date(),
        email: user.email,
        orderId: session.metadata.orderId,
        products: order.products as Product[],
      }),
    };

    try {
      const data = await transporter.sendMail(mailOptions);
      res.status(200).json({ data });
    } catch (error) {
      res.status(500).json({ error });
    }
  }

  return res.status(200).send();
};
