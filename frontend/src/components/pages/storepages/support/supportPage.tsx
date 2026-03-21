import React, { useState } from 'react';
import type { FormEvent } from 'react';
import './supportStyle.css';
import axios from 'axios';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL;

const SupportPage: React.FC = () => {
  // State to track which FAQ sections are expanded
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  // Form submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{type: string, message: string} | null>(null);

  // Function to toggle expanded/collapsed state
  const toggleSection = (sectionId: string) => {
    if (expandedSection === sectionId) {
      setExpandedSection(null);
    } else {
      setExpandedSection(sectionId);
    }
  };

  // Handle form submission
  const handleSupportFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    // Get form values
    const name = formData.get('name') as string;
    const whatsapp = formData.get('whatsapp') as string;
    const orderNo = formData.get('orderNo') as string;
    const message = formData.get('message') as string;
    
    try {
      // Send email to admin
      await axios.post(`${API_URL}/api/support/contact`, {
        name,
        whatsapp,
        orderNo: orderNo || 'Not provided',
        message,
        emailTo: 'admin@locals-za.co.za',
        subject: `Support Request: ${orderNo ? `Order #${orderNo}` : 'General Query'}`
      });
      
      // Show success message
      setSubmitStatus({
        type: 'success',
        message: 'Your query has been submitted successfully. We will get back to you soon.'
      });
      
      // Reset form
      form.reset();
      
    } catch (error) {
      console.error('Error submitting support form:', error);
      
      setSubmitStatus({
        type: 'error',
        message: 'There was an error submitting your query. Please try again or contact us directly via WhatsApp.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="support-container">
      <div className="support-header">
        <h1>Support Center</h1>
        <p>Find answers to common questions about using Locals.ZA</p>
        <p className='locals-info-text'>
          <span className='info-highlight'>LOCALSZA (PTY) LTD </span>
          <br/>
          <br/> Locals ZA is an SMME wholesale buyer and last mile delivery service.
          <br/> Locals ZA is registered with the Companies and Intellectual Property Commission (CIPC) of South Africa, ensuring compliance with all legal requirements for operating a business in the country.<br/>
          <br/> Reg No: 2025/692802/07
        </p>
        <p className='locals-info-text'>
          <span className='info-highlight'>Contact us at:</span><br/>
          Email: <a href="mailto:admin@locals-za.co.za" className="contact-link"> admin@locals-za.co.za </a><br/> 
          Call: <a href="tel:+27682858930" className="contact-link">+27 68 285 8930</a>
        </p>
      </div>

      <div className="support-content">
        {/* About LocalsZA Section */}
        <div className="faq-section">
          <h2>About LocalsZA</h2>
          
          <div className="faq-item">
            <div 
              className="faq-question" 
              onClick={() => toggleSection('who-is-localsza-for')}
            >
              <h3>Who is LocalsZA for?</h3>
            </div>
            
            {expandedSection === 'who-is-localsza-for' && (
              <div className="faq-answer">
                <p>LocalsZA is an exclusive supply chain aggregator and last-mile delivery service built for SMME business owners:</p>
                <ul>
                  <li>Spaza Shops</li>
                  <li>Salons</li>
                  <li>Food Outlets</li>
                </ul>
                <p>We focus on helping you consolidate suppliers, secure lower prices on fast-moving stock, and drastically reduce your transport costs.</p>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div 
              className="faq-question" 
              onClick={() => toggleSection('service-area')}
            >
              <h3>What is the service area?</h3>
            </div>
            
            {expandedSection === 'service-area' && (
              <div className="faq-answer">
                <p>We currently service Ekurhuleni. Please ensure your delivery address falls within this area when placing an order.</p>
              </div>
            )}
          </div>
        </div>

        {/* Orders & Placing Orders Section */}
        <div className="faq-section">
          <h2>Orders & Placing Orders</h2>
          
          <div className="faq-item">
            <div 
              className="faq-question" 
              onClick={() => toggleSection('place-order')}
            >
              <h3>How do I place an order?</h3>
            </div>
            
            {expandedSection === 'place-order' && (
              <div className="faq-answer">
                <p>Ordering your stock is fast and easy:</p>
                <ul>
                  <li><strong>Access our APP:</strong> Use the LocalsZA App on your mobile phone or tablet.</li>
                  <li><strong>Browse & Select:</strong> View the consolidated list of products we offer at the best prices.</li>
                  <li><strong>Checkout:</strong> Confirm your order and delivery details.</li>
                  <li><strong>Payment:</strong> Ozow is our payment service provider with instant EFT secure payment options.</li>
                </ul>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div 
              className="faq-question" 
              onClick={() => toggleSection('modify-cancel-order')}
            >
              <h3>Can I modify or cancel my order after it has been placed?</h3>
            </div>
            
            {expandedSection === 'modify-cancel-order' && (
              <div className="faq-answer">
                <p>Once your order has been successfully placed and the Instant EFT payment has been verified, we strongly advise against attempting to make any changes or cancellations.</p>
                <ul>
                  <li>Our system immediately initiates the consolidation process with our wholesale partners to secure the best prices and delivery route.</li>
                  <li>Attempting to update an order after payment verification will cause delays and may result in the entire order being rejected from the delivery route.</li>
                  <li>If you absolutely must cancel or adjust an order, please contact the in-app support chat immediately. Any request made after the cutoff time (20:00 the day before a scheduled delivery day) will likely be refused.</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Pricing & Payments Section */}
        <div className="faq-section">
          <h2>Pricing & Payments</h2>
          
          <div className="faq-item">
            <div 
              className="faq-question" 
              onClick={() => toggleSection('delivery-fee')}
            >
              <h3>What is the delivery fee?</h3>
            </div>
            
            {expandedSection === 'delivery-fee' && (
              <div className="faq-answer">
                <p>We offer a flat-rate, affordable delivery fee of just R80 per delivery.</p>
                <p>The R80 is a standard fee that helps us cover the costs of logistics and the first mile service of sourcing the best price and wholesaler to source from.</p>
                
              </div>
            )}
          </div>

          <div className="faq-item">
            <div 
              className="faq-question" 
              onClick={() => toggleSection('payment-methods')}
            >
              <h3>How can I pay for my order?</h3>
            </div>
            
            {expandedSection === 'payment-methods' && (
              <div className="faq-answer">
                <p>We currently accept secure, instant payments via Instant EFT. Your order will only be processed and dispatched once the Instant EFT payment has been successfully verified.</p>
              </div>
            )}
          </div>
        </div>

        {/* Delivery & Tracking Section */}
        <div className="faq-section">
          <h2>Delivery & Tracking</h2>
          
          <div className="faq-item">
            <div 
              className="faq-question" 
              onClick={() => toggleSection('delivery-days')}
            >
              <h3>What are your delivery days?</h3>
            </div>
            
            {expandedSection === 'delivery-days' && (
              <div className="faq-answer">
                <p>Next day delivery within 24hrs of placing your order.</p>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div 
              className="faq-question" 
              onClick={() => toggleSection('track-order')}
            >
              <h3>How can I track my order?</h3>
            </div>
            
            {expandedSection === 'track-order' && (
              <div className="faq-answer">
                <p><strong>In-App Tracking:</strong> You can view the real-time status of your order directly on the tracking page within the LocalsZA App.</p>
                <p><strong>Notifications:</strong> We will send you app notifications to update you on your order's progress, from confirmation to dispatch and final delivery.</p>
              </div>
            )}
          </div>
        </div>

        {/* Issues & Damaged Goods Section */}
        <div className="faq-section">
          <h2>Dealing with Issues & Damaged Goods</h2>
          
          <div className="faq-item">
            <div 
              className="faq-question" 
              onClick={() => toggleSection('damaged-items')}
            >
              <h3>What happens if an item is damaged upon arrival?</h3>
            </div>
            
            {expandedSection === 'damaged-items' && (
              <div className="faq-answer">
                <p>We prioritize the quality of your stock. We have a strict process to ensure all goods are collected from our wholesale partners in good order and properly secured for transport.</p>
                <p>If, however, you find an item is damaged upon delivery, please follow this process:</p>
                <ol>
                  <li><strong>Do Not Accept:</strong> If the damage is visible upon arrival, please refuse to accept the specific damaged item from the delivery driver.</li>
                  <li><strong>Notify Immediately:</strong> Make a note of the damage on the delivery slip and notify us immediately via the in-app support chat.</li>
                  <li><strong>Take Photos:</strong> Use the LocalsZA App to take clear photos of the damaged item(s) and upload them to the support chat.</li>
                  <li><strong>Resolution:</strong> Once the damage is verified, we will process a full refund or a credit to your account for the value of the damaged item.</li>
                </ol>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div 
              className="faq-question" 
              onClick={() => toggleSection('missing-items')}
            >
              <h3>What happens if I receive a missing item?</h3>
            </div>
            
            {expandedSection === 'missing-items' && (
              <div className="faq-answer">
                <p>We perform a thorough check of all items before dispatch. In the unlikely event an item from your confirmed order is missing:</p>
                <ul>
                  <li><strong>Notify Within 2 Hours:</strong> If an item is truly missing, please notify us via the in-app support chat within four (4) hours of your delivery time.</li>
                  <li><strong>Provide Details:</strong> Please provide your order number and the name and quantity of the missing product.</li>
                  <li><strong>Resolution:</strong> After verification, we will process a full refund or a credit to your account for the value of the missing item. We cannot dispatch a single missing item due to route efficiency, so the resolution will always be a refund or credit.</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Returns & Refunds Section */}
        <div className="faq-section">
          <h2>Returns & Refunds Policy</h2>
          
          <div className="faq-item">
            <div 
              className="faq-question" 
              onClick={() => toggleSection('return-policy')}
            >
              <h3>What is your returns & refunds policy?</h3>
            </div>
            
            {expandedSection === 'return-policy' && (
              <div className="faq-answer">
                <p>We focus on ensuring you get the correct, high-quality stock you ordered. Given the logistics of aggregating supplies and prioritizing fast delivery, our general policy is to handle issues via refunds/credits rather than accepting returns on correctly delivered goods.</p>
                
                <p><strong>Refunds for Damaged or Missing Goods:</strong></p>
                <ul>
                  <li><strong>Damaged Items:</strong> If an item is verified as damaged upon delivery (as per the "Dealing with Issues & Damaged Goods" section), a full refund or account credit for the value of the item will be processed.</li>
                  <li><strong>Missing Items:</strong> If an item is verified as missing from your order (as per the "Dealing with Issues & Damaged Goods" section), a full refund or account credit will be processed.</li>
                  <li><strong>Processing Time:</strong> Refunds are typically processed back to your original payment method (Instant EFT via Payfast) within 3-5 business days.</li>
                </ul>
                
                <p><strong>No Returns on Accepted Goods:</strong></p>
                <ul>
                  <li>We do not accept returns for items that were correctly delivered, accepted, and signed for by the client, as our supply chain logistics do not support reverse delivery.</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Contact Us Section */}
        <div className="contact-section">
          <div className="contact-header">
            <h2>Need More Help?</h2>
          </div>
          <p>Our customer support team is here to assist you with any questions or concerns.</p>
          
          <div className="contact-methods">
            <div className="contact-method">
            <h3>Get Support</h3>
            <p>Fill out this form for assistance</p>
            <form className="support-form" onSubmit={handleSupportFormSubmit}>
                <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input 
                    type="text" 
                    id="name" 
                    name="name" 
                    required 
                    placeholder="Your full name"
                />
                </div>
                
                <div className="form-group">
                <label htmlFor="whatsapp">WhatsApp Number</label>
                <input 
                    type="text" 
                    id="whatsapp" 
                    name="whatsapp" 
                    required 
                    placeholder="e.g. 073 123 4567"
                />
                </div>
                
                <div className="form-group">
                <label htmlFor="orderNo">Order Number <span className="optional">(Optional)</span></label>
                <input 
                    type="text" 
                    id="orderNo" 
                    name="orderNo" 
                    placeholder="#OrderNo12345"
                />
                </div>
                
                <div className="form-group">
                <label htmlFor="message">Message</label>
                <textarea 
                    id="message" 
                    name="message" 
                    required 
                    rows={4} 
                    placeholder="Please describe your issue or question in detail"
                ></textarea>
                </div>
                
                {submitStatus && (
                <div className={`form-status ${submitStatus.type}`}>
                    {submitStatus.message}
                </div>
                )}
                
                <button 
                type="submit" 
                className="submit-button" 
                disabled={isSubmitting}
                >
                {isSubmitting ? 'Sending...' : 'Submit Query'}
                </button>
            </form>
            <p className="contact-hours">We typically respond within 24 hours</p>
            </div>
            
            <div className="contact-method">
              <h3>Email Support</h3>
              <p>admin@locals-za.co.za</p>
              <p className="contact-hours">Response within 24 hours</p>
            </div>
            <div className="contact-method">
              <h3>Drivers Login</h3>
              <Link to="/driver-login" className="team-login-link">
                <img width="45" height="45" src="https://img.icons8.com/liquid-glass/45/driver.png" alt="driver"/>
              </Link>
              <h3>Buyers Login</h3>
              <Link to="/buyer-login" className="team-login-link">
                <img width="48" height="48" src="https://img.icons8.com/liquid-glass/48/men-age-group-5.png" alt="men-age-group-5"/>
              </Link>
              <h3>Sales Rep Login</h3>
              <Link to="/sales/login" className="team-login-link">
                <img width="48" height="48" src="https://img.icons8.com/liquid-glass/48/user-male-circle.png" alt="user-male-circle"/>
              </Link>
            </div>
            
            <div className="contact-method">
              <h3>WhatsApp Support</h3>
              <p>Get in touch with our Representative</p>
              <a 
                href="https://wa.me/27682858930" 
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp-link"
                aria-label="Contact us on WhatsApp"
              >
                <div className="whatsapp-icon pulsate">
                  <img 
                    width="48" 
                    height="48" 
                    src="https://img.icons8.com/color/48/whatsapp--v1.png" 
                    alt="WhatsApp Support"
                  />
                </div>
              </a>
              <p className="contact-hours">Monday-Friday: 8am - 5pm</p>
              <p className="contact-hours">Saturday: 9am - 3pm</p>
              <p className="contact-hours">Sunday: 9am - 1pm</p>
            </div>
          </div>
        </div>

        {/* Terms and Conditions Section */}
        <div className="faq-section">
          <h2>Terms and Conditions</h2>
          
          <div className="faq-item">
            <div 
              className="faq-question" 
              onClick={() => toggleSection('acceptance-terms')}
            >
              <h3>1. Acceptance of Terms</h3>
            </div>
            
            {expandedSection === 'acceptance-terms' && (
              <div className="faq-answer">
                <p>By accessing and using the LocalsZA application and services, you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.</p>
                <p><strong>Company Information:</strong></p>
                <ul>
                  <li>Legal Entity: LOCALSZA (PTY) LTD</li>
                  <li>Registration Number: 2025/692802/07</li>
                  <li>Type: Private Company</li>
                  <li>Registered with: Companies and Intellectual Property Commission (CIPC) of South Africa</li>
                </ul>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div 
              className="faq-question" 
              onClick={() => toggleSection('service-description')}
            >
              <h3>2. Service Description</h3>
            </div>
            
            {expandedSection === 'service-description' && (
              <div className="faq-answer">
                <p>LocalsZA provides:</p>
                <ul>
                  <li><strong>Supply Chain Aggregation:</strong> We consolidate wholesale suppliers to offer competitive pricing on fast-moving consumer goods.</li>
                  <li><strong>Last-Mile Delivery:</strong> We deliver orders to registered business clients in the Kathorus region (Katlehong, Vosloorus, Thokoza and surrounding areas).</li>
                  <li><strong>Business-to-Business Service:</strong> Our services are exclusively for registered SMME business owners including spaza shops, salons, and food outlets.</li>
                </ul>
                <p>We reserve the right to modify, suspend, or discontinue any aspect of our services at any time.</p>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div 
              className="faq-question" 
              onClick={() => toggleSection('user-eligibility')}
            >
              <h3>3. User Eligibility and Account Registration</h3>
            </div>
            
            {expandedSection === 'user-eligibility' && (
              <div className="faq-answer">
                <p><strong>Eligibility:</strong></p>
                <ul>
                  <li>You must be at least 18 years of age</li>
                  <li>You must be a registered business owner or authorized representative</li>
                  <li>Your business must operate within our service area</li>
                  <li>You must have the legal capacity to enter into binding contracts</li>
                </ul>
                <p><strong>Account Responsibility:</strong></p>
                <ul>
                  <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                  <li>You are responsible for all activities that occur under your account</li>
                  <li>You must notify us immediately of any unauthorized use of your account</li>
                  <li>Providing false or misleading information may result in account termination</li>
                </ul>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div 
              className="faq-question" 
              onClick={() => toggleSection('ordering-payment')}
            >
              <h3>4. Ordering and Payment Terms</h3>
            </div>
            
            {expandedSection === 'ordering-payment' && (
              <div className="faq-answer">
                <p><strong>Order Placement:</strong></p>
                <ul>
                  <li>All orders are subject to acceptance and availability</li>
                  <li>Prices are subject to change without notice until payment is confirmed</li>
                  <li>We reserve the right to refuse or cancel any order</li>
                  <li>Order confirmation is sent via email and in-app notification</li>
                </ul>
                <p><strong>Payment:</strong></p>
                <ul>
                  <li>Payment must be made via Instant EFT through our payment provider, Payfast</li>
                  <li>Orders are only processed after successful payment verification</li>
                  <li>All prices are in South African Rand (ZAR) and include VAT where applicable</li>
                  <li>A flat delivery fee of R80 applies to all orders</li>
                </ul>
                <p><strong>Order Modifications:</strong></p>
                <ul>
                  <li>Orders cannot be modified after payment confirmation</li>
                  <li>Cancellation requests must be made before 12:00pm the day before scheduled delivery</li>
                  <li>Cancellations after this time may not be honored due to logistics constraints</li>
                </ul>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div 
              className="faq-question" 
              onClick={() => toggleSection('delivery-terms')}
            >
              <h3>5. Delivery Terms</h3>
            </div>
            
            {expandedSection === 'delivery-terms' && (
              <div className="faq-answer">
                <p><strong>Delivery Schedule:</strong></p>
                <ul>
                  <li>Deliveries are made on fixed days: Monday, Wednesday, and Friday</li>
                  <li>Delivery timing depends on route optimization and may vary</li>
                  <li>We aim to deliver within the scheduled day but cannot guarantee specific time slots</li>
                </ul>
                <p><strong>Delivery Requirements:</strong></p>
                <ul>
                  <li>A responsible person must be available to receive the delivery</li>
                  <li>Signature confirmation is required for all deliveries</li>
                  <li>Delivery address must be within our service area (Kathorus region)</li>
                  <li>Accurate delivery information is the customer's responsibility</li>
                </ul>
                <p><strong>Failed Deliveries:</strong></p>
                <ul>
                  <li>If delivery cannot be completed due to incorrect address or unavailability, additional fees may apply</li>
                  <li>We will attempt to contact you using the provided contact details</li>
                  <li>Rescheduled deliveries may incur additional charges</li>
                </ul>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div 
              className="faq-question" 
              onClick={() => toggleSection('liability')}
            >
              <h3>6. Limitation of Liability</h3>
            </div>
            
            {expandedSection === 'liability' && (
              <div className="faq-answer">
                <p><strong>Service Availability:</strong></p>
                <ul>
                  <li>We strive for uninterrupted service but do not guarantee continuous availability</li>
                  <li>We are not liable for delays caused by circumstances beyond our control (weather, traffic, supplier issues, etc.)</li>
                </ul>
                <p><strong>Product Quality:</strong></p>
                <ul>
                  <li>We source products from reputable wholesale partners</li>
                  <li>Product quality issues must be reported within 4 hours of delivery</li>
                  <li>Our liability is limited to refund or credit for verified damaged or missing items</li>
                </ul>
                <p><strong>Maximum Liability:</strong></p>
                <ul>
                  <li>Our total liability shall not exceed the value of the specific order in question</li>
                  <li>We are not liable for indirect, consequential, or punitive damages</li>
                </ul>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div 
              className="faq-question" 
              onClick={() => toggleSection('intellectual-property')}
            >
              <h3>7. Intellectual Property</h3>
            </div>
            
            {expandedSection === 'intellectual-property' && (
              <div className="faq-answer">
                <p>All content on the LocalsZA application, including but not limited to text, graphics, logos, images, and software, is the property of LOCALSZA (PTY) LTD and is protected by South African and international intellectual property laws.</p>
                <ul>
                  <li>You may not reproduce, distribute, or create derivative works without written permission</li>
                  <li>The LocalsZA name, logo, and brand are registered trademarks</li>
                  <li>Unauthorized use may result in legal action</li>
                </ul>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div 
              className="faq-question" 
              onClick={() => toggleSection('prohibited-conduct')}
            >
              <h3>8. Prohibited Conduct</h3>
            </div>
            
            {expandedSection === 'prohibited-conduct' && (
              <div className="faq-answer">
                <p>You agree not to:</p>
                <ul>
                  <li>Use the service for any unlawful purpose</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Interfere with or disrupt the service or servers</li>
                  <li>Upload malicious code or viruses</li>
                  <li>Impersonate another person or entity</li>
                  <li>Harass, abuse, or harm other users or our staff</li>
                  <li>Use automated systems to access the service without permission</li>
                  <li>Resell or redistribute our services without authorization</li>
                </ul>
                <p>Violation of these terms may result in immediate account termination and legal action.</p>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div 
              className="faq-question" 
              onClick={() => toggleSection('termination')}
            >
              <h3>9. Account Termination</h3>
            </div>
            
            {expandedSection === 'termination' && (
              <div className="faq-answer">
                <p><strong>By LocalsZA:</strong></p>
                <ul>
                  <li>We reserve the right to suspend or terminate accounts at our discretion</li>
                  <li>Accounts may be terminated for violation of these terms</li>
                  <li>We will provide reasonable notice unless immediate termination is necessary</li>
                </ul>
                <p><strong>By User:</strong></p>
                <ul>
                  <li>You may close your account at any time by contacting support</li>
                  <li>Outstanding payments must be settled before account closure</li>
                  <li>Closed accounts cannot be reactivated; a new registration is required</li>
                </ul>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div 
              className="faq-question" 
              onClick={() => toggleSection('governing-law')}
            >
              <h3>10. Governing Law and Dispute Resolution</h3>
            </div>
            
            {expandedSection === 'governing-law' && (
              <div className="faq-answer">
                <p>These Terms and Conditions are governed by the laws of the Republic of South Africa.</p>
                <p><strong>Dispute Resolution:</strong></p>
                <ul>
                  <li>Any disputes will first be attempted to be resolved through good faith negotiations</li>
                  <li>If negotiations fail, disputes will be subject to the jurisdiction of South African courts</li>
                  <li>The venue for any legal proceedings shall be in Gauteng, South Africa</li>
                </ul>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div 
              className="faq-question" 
              onClick={() => toggleSection('changes-terms')}
            >
              <h3>11. Changes to Terms</h3>
            </div>
            
            {expandedSection === 'changes-terms' && (
              <div className="faq-answer">
                <p>We reserve the right to modify these Terms and Conditions at any time. Changes will be effective immediately upon posting to the application.</p>
                <ul>
                  <li>Continued use of the service after changes constitutes acceptance</li>
                  <li>Material changes will be communicated via email or in-app notification</li>
                  <li>It is your responsibility to review these terms periodically</li>
                </ul>
                <p><strong>Last Updated:</strong> March 2026</p>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div 
              className="faq-question" 
              onClick={() => toggleSection('privacy-policy')}
            >
              <h3>Privacy Policy</h3>
            </div>
            
            {expandedSection === 'privacy-policy' && (
              <div className="faq-answer">
                <p>LOCALSZA (PTY) LTD ("LocalsZA", "we", "us", or "our") is committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application and services.</p>
                <p><strong>Compliance:</strong></p>
                <ul>
                  <li>This policy complies with the Protection of Personal Information Act (POPIA) of South Africa</li>
                  <li>We are registered with CIPC (Reg No: 2025/692802/07)</li>
                  <li>We adhere to principles of lawfulness, fairness, and transparency in data processing</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;