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
      from: `"Commercify360" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: '🎉 You’re In! Welcome to the Amazon Ads Masterclass',
      html: `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; padding: 16px;">
      <h2 style="color: #0f9d58;">🎉 You’re In!</h2>
      <p>Thanks for registering for the <strong>Amazon Ads Masterclass</strong> with <strong>Commercify360</strong>.</p>

      <p>Your learning journey is about to begin. Get ready to unlock proven strategies to scale your brand on Amazon with data-backed advertising, expert insights, and hands-on guidance.</p>

      <h3>✅ What Happens Next:</h3>
      <ul>
        <li><strong>Course Access Details:</strong> You’ll receive an email shortly with your login credentials and session calendar.</li>
        <li><strong>Join the Community:</strong> Look out for an invite to our exclusive WhatsApp group — connect with peers, ask questions, and stay updated.</li>
        <li><strong>Prepare to Learn:</strong> Check your inbox for tips on how to get the most from this course.</li>
      </ul>

      <h3>🚀 What You’ll Learn:</h3>
      <ul>
        <li>How to leverage Amazon Ads for growth across Sponsored Products, Brands, Display, DSP, and Sponsored TV</li>
        <li>Practical strategies for targeting, bidding, and scaling campaigns</li>
        <li>Real-world insights from 200+ brands and millions in ad spend managed</li>
      </ul>

      <p>If you have any questions, feel free to reach out at <a href="mailto:support@commercify360.com">support@commercify360.com</a>.</p>

      <p style="margin-top: 24px;">See you in class!<br><strong>— The Commercify360 Team</strong></p>
    </div>
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

