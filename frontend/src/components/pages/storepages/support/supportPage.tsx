import React, { useState } from 'react';
import type { FormEvent } from 'react';
import './supportStyle.css';
import axios from 'axios';

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
      await axios.post('/api/support/contact', {
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
                <p>We currently service the East of Johannesburg (Ekhuruleni) region. Please ensure your delivery address falls within this area when placing an order.</p>
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
                  <li><strong>Payment:</strong> Payfast is our payment service provider with instant EFT secure payment options.</li>
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
                <p><strong>Free Delivery for Orders above R3500</strong></p>
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
                <p>To ensure optimal route efficiency and the lowest possible costs, LocalsZA delivers to the East of Johannesburg (Ekhuruleni) on three fixed days a week:</p>
                <p className="highlight-text">MONDAY, WEDNESDAY, and FRIDAY</p>
              </div>
            )}
          </div>

          <div className="faq-item">
            <div 
              className="faq-question" 
              onClick={() => toggleSection('delivery-timing')}
            >
              <h3>When will my delivery arrive?</h3>
            </div>
            
            {expandedSection === 'delivery-timing' && (
              <div className="faq-answer">
                <p>Your order's delivery day is based on the day you successfully place and pay for your order via Instant EFT:</p>
                <ul>
                  <li><strong>Sunday, Monday, or Tuesday</strong> – Delivery on Wednesday</li>
                  <li><strong>Wednesday or Thursday</strong> – Delivery on Friday</li>
                  <li><strong>Friday or Saturday</strong> – Delivery on Monday</li>
                </ul>
                <p className="important-note">Important: You must successfully complete your Instant EFT payment by 20:00 the day before a delivery day (e.g., Tuesday night for a Wednesday delivery) to ensure your stock is included in that day's route.</p>
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
              <h3>WhatsApp Support</h3>
              <p>Update Here</p>
              <p>Add Clickable Icon</p>
              <p className="contact-hours">Monday-Friday: 8am - 5pm</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;