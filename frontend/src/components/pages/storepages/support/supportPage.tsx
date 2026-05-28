import React, { useState } from 'react';
import type { FormEvent } from 'react';
import './supportStyle.css';
import axios from 'axios';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL;

const SupportPage: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [submitStatus, setSubmitStatus]       = useState<{ type: string; message: string } | null>(null);

  const toggleSection = (id: string) =>
    setExpandedSection(prev => (prev === id ? null : id));

  const handleSupportFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    const form     = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const name     = formData.get('name')     as string;
    const whatsapp = formData.get('whatsapp') as string;
    const orderNo  = formData.get('orderNo')  as string;
    const message  = formData.get('message')  as string;

    try {
      await axios.post(`${API_URL}/api/support/contact`, {
        name,
        whatsapp,
        orderNo: orderNo || 'Not provided',
        message,
        emailTo: 'admin@locals-za.co.za',
        subject: `Support Request: ${orderNo ? `Order #${orderNo}` : 'General Query'}`,
      });
      setSubmitStatus({
        type:    'success',
        message: 'Your query has been submitted. We will get back to you as soon as possible.',
      });
      form.reset();
    } catch {
      setSubmitStatus({
        type:    'error',
        message: 'There was an error submitting your query. Please try again or reach us via WhatsApp.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="support-container">

      {/* ── Header ── */}
      <div className="support-header">
        <h1>Support Centre</h1>
        <p>Everything you need to know about using LocalsZA</p>
        <p className="locals-info-text">
          <span className="info-highlight">LOCALSZA (PTY) LTD</span>
          <br /><br />
          LocalsZA is a same-day wholesale pickup and last-mile delivery service — built for
          spaza shops, salons, and SMME traders across Ekurhuleni. You upload your store
          receipt, we pick up your goods and deliver them to your door.
          <br /><br />
          Registered with the Companies and Intellectual Property Commission (CIPC) of South Africa.
          <br />Reg No: 2025/692802/07
        </p>
        <p className="locals-info-text">
          <span className="info-highlight">Contact us:</span><br />
          Company Profile:{' '}
          <a href="https://localsza.co.za/" className="contact-link">LocalsZA Company Profile</a><br />
          Email:{' '}
          <a href="mailto:admin@locals-za.co.za" className="contact-link">admin@locals-za.co.za</a><br />
          Call:{' '}
          <a href="tel:+27682858930" className="contact-link">+27 68 285 8930</a>
        </p>
      </div>

      <div className="support-content">

        {/* ── About LocalsZA ── */}
        <div className="faq-section">
          <h2>About LocalsZA</h2>

          <div className="faq-item">
            <div className="faq-question" onClick={() => toggleSection('what-is-localsza')}>
              <h3>What is LocalsZA?</h3>
            </div>
            {expandedSection === 'what-is-localsza' && (
              <div className="faq-answer">
                <p>
                  LocalsZA — a same day last-mile
                  delivery service that collects your bulk stock directly from our partner stores
                  and delivers it straight to your business.
                </p>
                <p>You handle the shopping. We handle the heavy lifting and the drive.</p>
                <ul>
                  <li>Visit our partner stores and purchase your stock</li>
                  <li>Upload your receipt on the LocalsZA app</li>
                  <li>Get an instant delivery quote based on distance and weight</li>
                  <li>Pay securely via Ozow Instant EFT</li>
                  <li>A LocalsZA driver collects your goods from the store and delivers to you — same day</li>
                </ul>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div className="faq-question" onClick={() => toggleSection('who-is-localsza-for')}>
              <h3>Who is LocalsZA for?</h3>
            </div>
            {expandedSection === 'who-is-localsza-for' && (
              <div className="faq-answer">
                <p>Our service is built exclusively for SMME business owners who buy stock in bulk:</p>
                <ul>
                  <li>Spaza shops &amp; general dealers</li>
                  <li>Hair salons &amp; beauty suppliers</li>
                  <li>Food outlets &amp; tuck shops</li>
                  <li>Any small business that needs to buy and receive bulk stock</li>
                </ul>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div className="faq-question" onClick={() => toggleSection('service-area')}>
              <h3>What is the service area?</h3>
            </div>
            {expandedSection === 'service-area' && (
              <div className="faq-answer">
                <p>
                  We currently service the <strong>Ekurhuleni region</strong> & 
                  Johannesburg East areas. This includes Germiston, Boksburg, Benoni, Brakpan, Alberton, Kempton Park, Edenvale, Bedfordview, and surrounding suburbs.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── How It Works ── */}
        <div className="faq-section">
          <h2>How It Works</h2>

          <div className="faq-item">
            <div className="faq-question" onClick={() => toggleSection('how-to-order')}>
              <h3>How do I use LocalsZA?</h3>
            </div>
            {expandedSection === 'how-to-order' && (
              <div className="faq-answer">
                <ol>
                  <li>
                    <strong>Shop at the cash-and-carry:</strong> Buy your stock as normal and collect
                    your receipt (printed till slip or tax invoice).
                  </li>
                  <li>
                    <strong>Open the LocalsZA app</strong> and select the store you shopped at.
                  </li>
                  <li>
                    <strong>Upload your receipt:</strong> Take a clear photo of your till slip and
                    upload it. Enter your name, contact number, and delivery address.
                  </li>
                  <li>
                    <strong>Review your delivery quote:</strong> We calculate your fee based on
                    distance and the weight of your goods.
                  </li>
                  <li>
                    <strong>Pay via Ozow Instant EFT</strong> — secure, instant, no card needed.
                  </li>
                  <li>
                    <strong>We do the rest:</strong> A driver is dispatched to collect your paid
                    goods from the store and deliver them to you — same day.
                  </li>
                </ol>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div className="faq-question" onClick={() => toggleSection('receipt-requirements')}>
              <h3>What are the receipt requirements?</h3>
            </div>
            {expandedSection === 'receipt-requirements' && (
              <div className="faq-answer">
                <p>
                  <strong>Your receipt is your collection authority.</strong> Our driver uses your
                  receipt to locate and verify your exact goods at the store. A poor-quality or
                  incomplete receipt will delay or prevent your collection.
                </p>
                <p>Before uploading, ensure your receipt:</p>
                <ul>
                  <li>Is the <strong>original till slip or tax invoice</strong> from the store</li>
                  <li>Shows the <strong>store name</strong> clearly</li>
                  <li>Lists <strong>every item</strong> with quantities and prices</li>
                  <li>Shows the <strong>date, transaction number, and total paid</strong></li>
                  <li>Is <strong>photographed flat, fully in frame, in good lighting</strong> — no blur, no cut-off edges</li>
                  <li>If multi-page, <strong>upload all pages</strong></li>
                </ul>
                <p>
                  <strong>Important:</strong> You must ensure your goods are still at the store and
                  available for collection at the time of booking. LocalsZA cannot be held responsible
                  if goods have already been removed or are unavailable when our driver arrives.
                </p>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div className="faq-question" onClick={() => toggleSection('modify-cancel')}>
              <h3>Can I modify or cancel my order after payment?</h3>
            </div>
            {expandedSection === 'modify-cancel' && (
              <div className="faq-answer">
                <p>
                  Once payment is confirmed, your order is immediately dispatched to our operations
                  team and a driver is allocated. <strong>We strongly advise against cancellations
                  after payment.</strong>
                </p>
                <ul>
                  <li>
                    If you need to cancel urgently, contact us via WhatsApp or the support form
                    <strong> before the driver reaches the store</strong>. Cancellations after
                    collection has begun cannot be processed.
                  </li>
                  <li>Orders cannot be modified after payment — you would need to cancel and re-order.</li>
                  <li>
                    Cancellation refunds are subject to a processing fee and are only possible
                    before the driver departs the pickup location.
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* ── Pricing & Payment ── */}
        <div className="faq-section">
          <h2>Pricing &amp; Payment</h2>

          <div className="faq-item">
            <div className="faq-question" onClick={() => toggleSection('delivery-fee')}>
              <h3>How is the delivery fee calculated?</h3>
            </div>
            {expandedSection === 'delivery-fee' && (
              <div className="faq-answer">
                <p>
                  Your delivery fee is calculated dynamically based on two factors:
                </p>
                <ul>
                  <li><strong>Distance:</strong> From the store to your delivery address</li>
                  <li><strong>Weight class:</strong> The estimated weight of your goods (light / medium / heavy / bulk), derived from your receipt</li>
                </ul>
                <p>
                  You will see your exact quote before you pay — there are no hidden fees or
                  surprises. The price shown at checkout is the price you pay.
                </p>
                <p>
                  A <strong>rush fee</strong> may apply during peak hours or for priority same-day
                  slots. This is shown clearly on your quote.
                </p>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div className="faq-question" onClick={() => toggleSection('payment-methods')}>
              <h3>How do I pay?</h3>
            </div>
            {expandedSection === 'payment-methods' && (
              <div className="faq-answer">
                <p>
                  We accept payment via <strong>Ozow Instant EFT</strong> — a secure, bank-verified
                  payment method that does not require a credit card. Funds are transferred directly
                  from your bank account.
                </p>
                <p>
                  Your order will only be processed and a driver dispatched once payment has been
                  successfully verified by Ozow. We do not accept cash on delivery.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Delivery ── */}
        <div className="faq-section">
          <h2>Delivery</h2>

          <div className="faq-item">
            <div className="faq-question" onClick={() => toggleSection('delivery-time')}>
              <h3>When will my order arrive?</h3>
            </div>
            {expandedSection === 'delivery-time' && (
              <div className="faq-answer">
                <p>
                  LocalsZA operates on a <strong>same-day delivery</strong> promise. Orders placed
                  and paid for before our daily cutoff will be collected and delivered the same day.
                </p>
                <ul>
                  <li>Orders confirmed before <strong>14:00</strong> are prioritised for same-day delivery</li>
                  <li>Orders after 14:00 may be scheduled for the following morning slot</li>
                  <li>Exact arrival time depends on driver availability and route — you will receive
                    in-app status updates as your order progresses</li>
                </ul>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div className="faq-question" onClick={() => toggleSection('track-order')}>
              <h3>How do I track my order?</h3>
            </div>
            {expandedSection === 'track-order' && (
              <div className="faq-answer">
                <p>
                  Track your delivery in real time via the LocalsZA app. You will receive push
                  notifications at each stage:
                </p>
                <ul>
                  <li><strong>Order Confirmed</strong> — payment received, driver being allocated</li>
                  <li><strong>Driver En Route to Store</strong> — driver is heading to the cash-and-carry</li>
                  <li><strong>Goods Collected</strong> — driver has your stock and is heading to you</li>
                  <li><strong>Out for Delivery</strong> — driver is on the way</li>
                  <li><strong>Delivered</strong> — order complete</li>
                </ul>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div className="faq-question" onClick={() => toggleSection('receiving-delivery')}>
              <h3>What do I need to do when my delivery arrives?</h3>
            </div>
            {expandedSection === 'receiving-delivery' && (
              <div className="faq-answer">
                <p>
                  <strong>Check every item before confirming delivery.</strong> Once you sign off on
                  delivery or the driver marks the order as delivered in the app, your order is
                  considered complete and accepted.
                </p>
                <ul>
                  <li>Count all items against your receipt before the driver leaves</li>
                  <li>Inspect packaging for any visible damage immediately</li>
                  <li>
                    If anything is missing or damaged, <strong>raise it with the driver on the spot
                    and do not confirm delivery</strong> until it is noted
                  </li>
                  <li>
                    A responsible person must be present at the delivery address — we cannot leave
                    goods unattended
                  </li>
                </ul>
                <p>
                  <strong>We cannot guarantee assistance for issues raised after delivery has been
                  confirmed.</strong> Our drivers collect exactly what is on your receipt — once that
                  handover is complete and signed off, the goods are in your care.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Issues ── */}
        <div className="faq-section">
          <h2>Issues &amp; Disputes</h2>

          <div className="faq-item">
            <div className="faq-question" onClick={() => toggleSection('damaged-items')}>
              <h3>What if an item is damaged on arrival?</h3>
            </div>
            {expandedSection === 'damaged-items' && (
              <div className="faq-answer">
                <p>
                  If you notice damage <strong>before confirming delivery</strong>, follow this
                  process immediately:
                </p>
                <ol>
                  <li><strong>Do not accept the damaged item</strong> — refuse it to the driver before sign-off</li>
                  <li>Note the damage on the delivery confirmation</li>
                  <li>Contact us immediately via the support form or WhatsApp with photos</li>
                  <li>A credit or refund for the verified damaged item will be processed</li>
                </ol>
                <p>
                  <strong>Issues reported after delivery confirmation cannot be guaranteed to receive
                  a resolution.</strong> We strongly urge you to inspect all goods at the door.
                </p>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div className="faq-question" onClick={() => toggleSection('missing-items')}>
              <h3>What if an item is missing?</h3>
            </div>
            {expandedSection === 'missing-items' && (
              <div className="faq-answer">
                <p>
                  Our drivers collect goods based on the receipt you uploaded. In rare cases a
                  store may have an item out of stock — the driver will note this and inform you.
                </p>
                <p>If you believe an item is missing:</p>
                <ul>
                  <li><strong>Raise it before confirming delivery</strong> — do not sign off if items are missing</li>
                  <li>
                    If you have already confirmed and then notice a missing item, contact us
                    <strong> within 2 hours of delivery</strong> with your order number and a photo
                    of what was received
                  </li>
                  <li>
                    <strong>We cannot process claims for missing items raised after the 2-hour window
                    or after delivery has been confirmed without noting the shortage.</strong>
                  </li>
                </ul>
                <p>
                  Resolution for verified missing items will be a refund or account credit — we
                  cannot dispatch a driver for a single missing item.
                </p>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div className="faq-question" onClick={() => toggleSection('wrong-goods')}>
              <h3>What if the driver collected the wrong goods?</h3>
            </div>
            {expandedSection === 'wrong-goods' && (
              <div className="faq-answer">
                <p>
                  Our drivers collect exactly what is itemised on the receipt you uploaded. If you
                  believe the wrong goods were delivered:
                </p>
                <ul>
                  <li>Do not confirm delivery — compare goods to your receipt on the spot</li>
                  <li>If goods do not match, refuse the delivery and contact us immediately</li>
                  <li>
                    We will investigate using the receipt you submitted and the driver's collection
                    record
                  </li>
                </ul>
                <p>
                  <strong>Responsibility reminder:</strong> LocalsZA collects what is on your
                  receipt. Ensure your receipt is accurate and complete before uploading. We are
                  not liable for discrepancies originating from an incorrect or partial receipt.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Returns & Refunds ── */}
        <div className="faq-section">
          <h2>Returns &amp; Refunds</h2>

          <div className="faq-item">
            <div className="faq-question" onClick={() => toggleSection('refund-policy')}>
              <h3>What is the refund policy?</h3>
            </div>
            {expandedSection === 'refund-policy' && (
              <div className="faq-answer">
                <p>
                  Refunds are only applicable in the following circumstances:
                </p>
                <ul>
                  <li><strong>Verified damaged goods</strong> — reported before delivery confirmation</li>
                  <li><strong>Verified missing items</strong> — reported within 2 hours and before confirmation</li>
                  <li><strong>Cancelled orders</strong> — requested before the driver departs the store</li>
                </ul>
                <p>
                  <strong>No refunds will be processed for:</strong>
                </p>
                <ul>
                  <li>Goods that were accepted and delivery was confirmed</li>
                  <li>Change-of-mind after payment</li>
                  <li>Issues with goods that originated from the store (product quality, expiry dates) — these must be taken up directly with the cash-and-carry</li>
                  <li>Claims raised more than 2 hours after delivery</li>
                </ul>
                <p>
                  Approved refunds are processed back to your original payment method via Ozow
                  within <strong>3–5 business days</strong>.
                </p>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div className="faq-question" onClick={() => toggleSection('no-returns')}>
              <h3>Do you accept returns?</h3>
            </div>
            {expandedSection === 'no-returns' && (
              <div className="faq-answer">
                <p>
                  <strong>We do not accept returns on accepted and confirmed deliveries.</strong>
                </p>
                <p>
                  LocalsZA is a collection and delivery service — we do not own or stock the goods.
                  Once a delivery is confirmed, the goods are in your possession and the collection
                  transaction with the store is complete. Returns or exchanges must be arranged
                  directly with the cash-and-carry store where the goods were purchased.
                </p>
                <p>
                  This is why we strongly urge you to <strong>inspect every item before confirming
                  delivery</strong>. Once you confirm, we cannot guarantee we will be able to assist.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Contact ── */}
        <div className="contact-section">
          <div className="contact-header">
            <h2>Need Help?</h2>
          </div>
          <p>
            Our support team is available to assist with your order. Please include your order
            number wherever possible — it speeds things up significantly.
          </p>

          <div className="contact-methods">
            {/* Support Form */}
            <div className="contact-method">
              <h3>Submit a Query</h3>
              <p>Fill in the form and we will get back to you</p>
              <form className="support-form" onSubmit={handleSupportFormSubmit}>
                <div className="form-group">
                  <label htmlFor="name">Full Name</label>
                  <input type="text" id="name" name="name" required placeholder="Your full name" />
                </div>
                <div className="form-group">
                  <label htmlFor="whatsapp">WhatsApp Number</label>
                  <input type="text" id="whatsapp" name="whatsapp" required placeholder="e.g. 073 123 4567" />
                </div>
                <div className="form-group">
                  <label htmlFor="orderNo">
                    Order Number <span className="optional">(Optional)</span>
                  </label>
                  <input type="text" id="orderNo" name="orderNo" placeholder="e.g. ORD-2026-012" />
                </div>
                <div className="form-group">
                  <label htmlFor="message">Message</label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={4}
                    placeholder="Describe your issue in detail. If reporting a missing or damaged item, include what it is and your order number."
                  />
                </div>
                {submitStatus && (
                  <div className={`form-status ${submitStatus.type}`}>
                    {submitStatus.message}
                  </div>
                )}
                <button type="submit" className="submit-button" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending…' : 'Submit Query'}
                </button>
              </form>
              <p className="contact-hours">We typically respond within 24 hours</p>
            </div>

            {/* Email */}
            <div className="contact-method">
              <h3>Email Support</h3>
              <p>admin@locals-za.co.za</p>
              <p className="contact-hours">Response within 24 hours</p>
            </div>

            {/* Team Logins */}
            <div className="contact-method">
              <h3>Drivers Login</h3>
              <Link to="/driverlogin" className="team-login-link">
                <img
                  width="45" height="45"
                  src="https://firebasestorage.googleapis.com/v0/b/localsza.firebasestorage.app/o/logos%2FdriverLogo.png?alt=media&token=f9413fdd-7ea8-43d9-a013-8161dd5bd34f"
                  alt="Driver login"
                  className="team-login-button"
                />
              </Link>
            </div>

            {/* WhatsApp */}
            <div className="contact-method">
              <h3>WhatsApp Support</h3>
              <p>Speak directly with our team</p>
              <a
                href="https://wa.me/27682858930"
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp-link"
                aria-label="Contact us on WhatsApp"
              >
                <div className="whatsapp-icon pulsate">
                  <img
                    width="48" height="48"
                    src="https://img.icons8.com/color/48/whatsapp--v1.png"
                    alt="WhatsApp"
                  />
                </div>
              </a>
              <p className="contact-hours">Monday – Friday: 8am – 5pm</p>
              <p className="contact-hours">Saturday: 9am – 3pm</p>
              <p className="contact-hours">Sunday: 9am – 1pm</p>
            </div>
          </div>
        </div>

        {/* ── Terms & Conditions ── */}
        <div className="faq-section">
          <h2>Terms and Conditions</h2>

          <div className="faq-item">
            <div className="faq-question" onClick={() => toggleSection('acceptance-terms')}>
              <h3>1. Acceptance of Terms</h3>
            </div>
            {expandedSection === 'acceptance-terms' && (
              <div className="faq-answer">
                <p>
                  By using the LocalsZA application and services, you accept and agree to be bound
                  by these Terms and Conditions. If you do not agree, please do not use our services.
                </p>
                <ul>
                  <li>Legal Entity: LOCALSZA (PTY) LTD</li>
                  <li>Registration Number: 2025/692802/07</li>
                  <li>Type: Private Company</li>
                  <li>Registered with: CIPC of South Africa</li>
                </ul>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div className="faq-question" onClick={() => toggleSection('service-description')}>
              <h3>2. Service Description</h3>
            </div>
            {expandedSection === 'service-description' && (
              <div className="faq-answer">
                <p>LocalsZA provides a same-day wholesale pickup and last-mile delivery service:</p>
                <ul>
                  <li>
                    <strong>Receipt-Based Collection:</strong> Customers upload a receipt from a
                    partner cash-and-carry store. A LocalsZA driver collects the paid goods and
                    delivers them to the customer's address.
                  </li>
                  <li>
                    <strong>Last-Mile Delivery:</strong> Deliveries are made within the Ekurhuleni
                    region. We do not own, stock, or sell the goods — we provide the collection and
                    delivery service only.
                  </li>
                  <li>
                    <strong>Business-to-Business:</strong> Our service is exclusively for registered
                    SMME business owners.
                  </li>
                </ul>
                <p>We reserve the right to modify, suspend, or discontinue services at any time.</p>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div className="faq-question" onClick={() => toggleSection('user-eligibility')}>
              <h3>3. User Eligibility and Account Registration</h3>
            </div>
            {expandedSection === 'user-eligibility' && (
              <div className="faq-answer">
                <p><strong>Eligibility:</strong></p>
                <ul>
                  <li>You must be at least 18 years of age</li>
                  <li>You must be a registered business owner or authorised representative</li>
                  <li>Your business must operate within our service area</li>
                  <li>You must have legal capacity to enter into binding contracts</li>
                </ul>
                <p><strong>Account Responsibility:</strong></p>
                <ul>
                  <li>You are responsible for all activity under your account</li>
                  <li>You must notify us immediately of any unauthorised use</li>
                  <li>Providing false information may result in account termination</li>
                </ul>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div className="faq-question" onClick={() => toggleSection('ordering-payment')}>
              <h3>4. Ordering and Payment Terms</h3>
            </div>
            {expandedSection === 'ordering-payment' && (
              <div className="faq-answer">
                <p><strong>Order Placement:</strong></p>
                <ul>
                  <li>
                    The customer is responsible for ensuring the goods listed on their uploaded
                    receipt are still available at the store at the time of booking
                  </li>
                  <li>
                    LocalsZA cannot be held responsible if goods are unavailable, already removed,
                    or out of stock when the driver arrives
                  </li>
                  <li>Receipt photos must be clear, complete, and legible — incomplete receipts may result in collection delays or errors</li>
                  <li>All prices are in South African Rand (ZAR)</li>
                </ul>
                <p><strong>Payment:</strong></p>
                <ul>
                  <li>Payment is via Ozow Instant EFT — orders are only dispatched after successful payment verification</li>
                  <li>We do not accept cash on delivery</li>
                  <li>The delivery fee shown at checkout is final and includes all applicable charges</li>
                </ul>
                <p><strong>Cancellations:</strong></p>
                <ul>
                  <li>Cancellations must be requested before the driver departs the pickup location</li>
                  <li>Cancellations after collection has commenced cannot be processed</li>
                  <li>A cancellation processing fee may apply</li>
                </ul>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div className="faq-question" onClick={() => toggleSection('delivery-terms')}>
              <h3>5. Delivery Terms</h3>
            </div>
            {expandedSection === 'delivery-terms' && (
              <div className="faq-answer">
                <p><strong>Same-Day Delivery:</strong></p>
                <ul>
                  <li>We aim to deliver on the same day as payment confirmation</li>
                  <li>Orders confirmed before 14:00 are prioritised for same-day delivery</li>
                  <li>We aim to deliver within the scheduled window but cannot guarantee specific time slots due to traffic and route optimisation</li>
                </ul>
                <p><strong>Receiving Your Delivery:</strong></p>
                <ul>
                  <li>
                    <strong>A responsible person must be present to receive and inspect the goods
                    before confirming delivery</strong>
                  </li>
                  <li>Count and inspect all items against your receipt before the driver leaves</li>
                  <li>Delivery confirmation is final — goods are in your care once signed off</li>
                  <li>We cannot leave goods unattended</li>
                </ul>
                <p><strong>Failed Deliveries:</strong></p>
                <ul>
                  <li>If no one is available at the address, the driver will contact you and may return if route allows — additional fees may apply</li>
                  <li>Accurate delivery address information is the customer's responsibility</li>
                </ul>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div className="faq-question" onClick={() => toggleSection('liability')}>
              <h3>6. Limitation of Liability</h3>
            </div>
            {expandedSection === 'liability' && (
              <div className="faq-answer">
                <p><strong>Scope of Service:</strong></p>
                <ul>
                  <li>
                    LocalsZA is a collection and delivery intermediary. We are not the seller of
                    the goods and are not responsible for their quality, authenticity, or compliance
                    — these are the responsibility of the cash-and-carry store.
                  </li>
                  <li>
                    Our liability is limited to the correct collection and delivery of the goods
                    listed on the customer's uploaded receipt.
                  </li>
                </ul>
                <p><strong>After Delivery:</strong></p>
                <ul>
                  <li>
                    <strong>Once a delivery has been confirmed, LocalsZA cannot guarantee it will be
                    possible to resolve disputes about the goods delivered.</strong> Customers must
                    inspect all items before confirmation.
                  </li>
                  <li>Our maximum liability shall not exceed the delivery fee paid for the specific order in question</li>
                  <li>We are not liable for indirect, consequential, or punitive damages</li>
                </ul>
                <p><strong>Service Availability:</strong></p>
                <ul>
                  <li>We are not liable for delays caused by circumstances beyond our control — weather, traffic, store closures, supplier issues, load shedding, etc.</li>
                </ul>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div className="faq-question" onClick={() => toggleSection('intellectual-property')}>
              <h3>7. Intellectual Property</h3>
            </div>
            {expandedSection === 'intellectual-property' && (
              <div className="faq-answer">
                <p>
                  All content on the LocalsZA application — including text, graphics, logos, images,
                  and software — is the property of LOCALSZA (PTY) LTD and is protected by South
                  African and international intellectual property laws.
                </p>
                <ul>
                  <li>You may not reproduce, distribute, or create derivative works without written permission</li>
                  <li>The LocalsZA name, logo, and brand are registered trademarks</li>
                  <li>Unauthorised use may result in legal action</li>
                </ul>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div className="faq-question" onClick={() => toggleSection('prohibited-conduct')}>
              <h3>8. Prohibited Conduct</h3>
            </div>
            {expandedSection === 'prohibited-conduct' && (
              <div className="faq-answer">
                <p>You agree not to:</p>
                <ul>
                  <li>Upload fraudulent, altered, or duplicate receipts</li>
                  <li>Place orders for goods that are not yours or that you have not paid for at the store</li>
                  <li>Use the service for any unlawful purpose</li>
                  <li>Attempt to gain unauthorised access to our systems</li>
                  <li>Harass, abuse, or harm our drivers or staff</li>
                  <li>Use automated systems to access the service without permission</li>
                  <li>Resell or redistribute our services without authorisation</li>
                </ul>
                <p>Violation of these terms may result in immediate account termination and legal action.</p>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div className="faq-question" onClick={() => toggleSection('termination')}>
              <h3>9. Account Termination</h3>
            </div>
            {expandedSection === 'termination' && (
              <div className="faq-answer">
                <p><strong>By LocalsZA:</strong></p>
                <ul>
                  <li>We reserve the right to suspend or terminate accounts at our discretion</li>
                  <li>Accounts may be terminated for violation of these terms, fraudulent receipts, or abusive conduct toward our team</li>
                </ul>
                <p><strong>By User:</strong></p>
                <ul>
                  <li>You may close your account at any time by contacting support</li>
                  <li>Outstanding balances must be settled before closure</li>
                </ul>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div className="faq-question" onClick={() => toggleSection('governing-law')}>
              <h3>10. Governing Law and Dispute Resolution</h3>
            </div>
            {expandedSection === 'governing-law' && (
              <div className="faq-answer">
                <p>These Terms and Conditions are governed by the laws of the Republic of South Africa.</p>
                <ul>
                  <li>Disputes will first be resolved through good-faith negotiation</li>
                  <li>Unresolved disputes are subject to the jurisdiction of South African courts in Gauteng</li>
                </ul>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div className="faq-question" onClick={() => toggleSection('changes-terms')}>
              <h3>11. Changes to Terms</h3>
            </div>
            {expandedSection === 'changes-terms' && (
              <div className="faq-answer">
                <p>
                  We reserve the right to modify these Terms and Conditions at any time. Changes
                  are effective immediately upon posting to the application.
                </p>
                <ul>
                  <li>Continued use of the service constitutes acceptance of updated terms</li>
                  <li>Material changes will be communicated via in-app notification</li>
                </ul>
                <p><strong>Last Updated:</strong> May 2026</p>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div className="faq-question" onClick={() => toggleSection('privacy-policy')}>
              <h3>Privacy Policy</h3>
            </div>
            {expandedSection === 'privacy-policy' && (
              <div className="faq-answer">
                <p>
                  LOCALSZA (PTY) LTD is committed to protecting your privacy in accordance with
                  the <strong>Protection of Personal Information Act (POPIA)</strong> of South Africa.
                </p>
                <p><strong>What we collect:</strong></p>
                <ul>
                  <li>Name, contact number, and delivery address (for order fulfilment)</li>
                  <li>Receipt images (to facilitate collection from the store)</li>
                  <li>Payment confirmation data from Ozow (we do not store card or banking details)</li>
                </ul>
                <p><strong>How we use it:</strong></p>
                <ul>
                  <li>To process and deliver your order</li>
                  <li>To communicate order status updates</li>
                  <li>To resolve disputes and support queries</li>
                </ul>
                <p>
                  We do not sell or share your personal information with third parties outside of
                  order fulfilment. Receipt images are stored securely and used solely for
                  collection verification.
                </p>
                <p>Reg No: 2025/692802/07 — Registered with CIPC of South Africa.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SupportPage;
