const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const dotenv = require('dotenv');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET_KEY,
});

// 📦 POST /create-order
app.post('/create-order', async (req, res) => {
  const { amount } = req.body;

  const options = {
    amount: amount * 100, // amount in paisa
    currency: 'INR',
    receipt: `receipt_order_${Date.now()}`,
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err) {
    console.error('❌ Order creation error:', err.message);
    res.status(500).json({ error: 'Order creation failed' });
  }
});

// ✅ POST /verify-payment
// ✅ POST /verify-payment
app.post('/verify-payment', async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    userEmail,
    userName = 'Customer',
    userPhone,
    userLinkedIn,
  } = req.body;

  if (!userEmail || !userName || !userPhone || !userLinkedIn) {
    return res.status(400).json({
      status: 'failure',
      error: 'Missing user details (name, email, phone, LinkedIn)',
    });
  }

  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_SECRET_KEY)
    .update(body.toString())
    .digest('hex');

  if (expectedSignature === razorpay_signature) {
    console.log('✅ Verified payment:', razorpay_payment_id);

    // Optionally: log or store full user info here
    console.table({
      Name: userName,
      Email: userEmail,
      Phone: userPhone,
      LinkedIn: userLinkedIn,
      PaymentID: razorpay_payment_id,
    });

    // Email setup
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Your Brand" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: '🎉 Payment Successful – Access Granted',
      html: `
        <h2>Hello ${userName},</h2>
        <p>Thank you for purchasing the course!</p>
        <p><strong>Payment ID:</strong> ${razorpay_payment_id}</p>
        <hr />
        <p><strong>Phone:</strong> ${userPhone}</p>
        <p><strong>LinkedIn:</strong> <a href="${userLinkedIn}" target="_blank">${userLinkedIn}</a></p>
        <br />
        <p>You now have lifetime access to the course materials.</p>
        <p>Feel free to reach out if you have any questions.</p>
        <br />
        <p>– Your Team</p>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('📧 Email sent to', userEmail);
    } catch (err) {
      console.error('📛 Email error:', err.message);
    }

    res.json({ status: 'success' });
  } else {
    console.warn('❌ Signature mismatch!');
    res.status(400).json({ status: 'failure', error: 'Invalid signature' });
  }
});


// 🟢 Start Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
