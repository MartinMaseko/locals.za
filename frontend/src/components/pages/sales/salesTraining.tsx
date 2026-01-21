import './salesStyles.css';

const HustlePage = () => {
  return (
    <div className="sales-dashboard">
      <div className="sales-section">
        <h2 className="training-header">
          LocalsZA Sales Training
        </h2>
        <p className="training-subtitle">
          Transforming Township Supply Chains - Comprehensive Sales Course
        </p>
        
        <div className="training-content">
          <div className="pitch-framework">
            <h3>Module 1: The LocalsZA Philosophy & Mission</h3>
            
            <div className="pitch-section">
              <h4>Ubuntu-Driven Strategy</h4>
              <p><strong>Core Philosophy:</strong> Ubuntu—a commitment to communal success. You're not selling an app, you're selling the benefits of using LocalsZA: buying power, cashback savings, and cheaper delivery rates.</p>
              <p><strong>Your Core Mandate:</strong> Expose the biggest hidden costs facing small businesses—Fragmented Logistics and Buying Alone.</p>
              <p><strong>Value Proposition:</strong> We help businesses Buy Smart, Save Time, and Save Money through bulk discounts and reliable delivery networks.</p>
            </div>

            <div className="pitch-section">
              <h4>Operations & Product Knowledge</h4>
              <p><strong>Delivery Logistics:</strong> Fixed delivery days (Monday, Wednesday, Friday) for maximum route efficiency.</p>
              <ul>
                <li>• Orders Sunday, Saturday, Friday → Monday delivery</li>
                <li>• Orders Monday & Tuesday → Wednesday delivery</li>
                <li>• Orders Wednesday & Thursday → Friday delivery</li>
              </ul>
              <p><strong>Secure Payments:</strong> All transactions via Payfast (Instant EFT) for security and trust.</p>
            </div>
          </div>

          <div className="pitch-framework">
            <h3>6-Step Pitch Framework</h3>
            
            <div className="pitch-section">
              <h4>Step 1: The Warmer & Opener (The Hook)</h4>
              <p><strong>Goal:</strong> Establish credibility and rapport while gaining control within the first minute.</p>
              <p><strong>Strategy:</strong> Use a "Hook" based on local observation or shared community challenge to differentiate from standard salespeople.</p>
              <p><strong>Example:</strong> "Hi [Name], I noticed you're doing well here in [Township]. I work with LocalsZA helping businesses like yours cut their supply costs by 15-30%. Can I show you something that might interest you?"</p>
              <p><strong>Objective:</strong> Secure the right to move into diagnostic phase by demonstrating understanding of local township business environment.</p>
            </div>

            <div className="pitch-section">
              <h4>Step 2: Diagnosis (Gap Selling)</h4>
              <p><strong>Goal:</strong> Identify the "Gap" between current operations and a more profitable state.</p>
              <p><strong>Strategy:</strong> Gather data on current logistics: fuel expenditures, driver costs, time away from shop, stock location challenges.</p>
              <p><strong>Key Questions:</strong></p>
              <ul>
                <li>• "How often do you or your staff travel to get stock?"</li>
                <li>• "What does that cost you in fuel and time each month?"</li>
                <li>• "How much stock do you have to buy at once to make the trip worthwhile?"</li>
              </ul>
              <p><strong>Objective:</strong> Uncover specific pain points in their supply chain for tailored solutions.</p>
            </div>

            <div className="pitch-section">
              <h4>Step 3: The Reframe (The Mental Shift)</h4>
              <p><strong>Goal:</strong> Educate customer on their true business problem.</p>
              <p><strong>Strategy:</strong> Shift perspective from "stock prices" to hidden costs of fragmented logistics and "Buying Alone".</p>
              <p><strong>Key Message:</strong> "You're not just buying stock—you're paying for a logistics solution that doesn't give you bulk buying power."</p>
              <p><strong>Objective:</strong> Make them realize current sourcing method fails to leverage network's bulk buying power.</p>
            </div>

            <div className="pitch-section">
              <h4>Step 4: Rational Drowning & Emotional Impact</h4>
              <p><strong>Goal:</strong> Make the problem undeniable through data and personal connection.</p>
              <p><strong>Strategy:</strong> Calculate their annual loss in Rand value using diagnosis data.</p>
              <p><strong>Example:</strong> "If you're spending R2,000 monthly on fuel and driver costs, that's R24,000 yearly—money that could go toward expanding your business."</p>
              <p><strong>Objective:</strong> Connect hard numbers to personal goals, making financial "leak" feel personal.</p>
            </div>

            <div className="pitch-section">
              <h4>Step 5: The LocalsZA Solution (The New Way)</h4>
              <p><strong>Goal:</strong> Introduce "Buy Smart" partnership.</p>
              <p><strong>Strategy:</strong> Position business as "Mini Cash & Carry" with bulk discounts and flat-rate R80 delivery.</p>
              <p><strong>Key Benefits:</strong></p>
              <ul>
                <li>• Bulk pricing without bulk storage requirements</li>
                <li>• Predictable R80 delivery cost</li>
                <li>• More time in your shop serving customers</li>
                <li>• Digital ordering convenience</li>
              </ul>
              <p><strong>Special Note:</strong> For hair suppliers (e.g., Cosmetic Connection), emphasize data-driven marketing and catalog management capabilities.</p>
            </div>

            <div className="pitch-section">
              <h4>Step 6: The CTA Close (Immediate Momentum)</h4>
              <p><strong>Goal:</strong> Secure commitment and take physical action.</p>
              <p><strong>Strategy:</strong> Facilitate immediate onboarding onto mobile application.</p>
              <p><strong>Closing Lines:</strong></p>
              <ul>
                <li>• "Let me set up your account right now so you can see our wholesale prices."</li>
                <li>• "Shall we place a small test order today to see how this works?"</li>
              </ul>
              <p><strong>Objective:</strong> Close with pilot order to begin transition into new supply chain model.</p>
            </div>
          </div>

          <div className="growth-hacks">
            <h3>Strategic Objection Handling</h3>
            
            <div className="pitch-section">
              <h4>Total Landed Cost vs. Shelf Price</h4>
              <p><strong>Objection:</strong> "Your prices are higher than my supplier."</p>
              <p><strong>Response:</strong> "Let's look at total landed cost—what you actually pay including transport, fuel, and time. Our bulk pricing plus R80 delivery often works out cheaper than your current total cost."</p>
            </div>

            <div className="pitch-section">
              <h4>Logistics vs. Price Solutions</h4>
              <p><strong>Objection:</strong> "I have a driver already."</p>
              <p><strong>Response:</strong> "That's great for delivery, but a driver doesn't give you bulk buying power. LocalsZA gives you both—better prices through our network AND reliable delivery."</p>
            </div>

            <div className="pitch-section">
              <h4>Institutional Trust</h4>
              <p><strong>Objection:</strong> "I don't trust online payments."</p>
              <p><strong>Response:</strong> "I understand. We use Payfast—the same secure system banks use. Plus, you can see our delivery trucks in your area every week. We're not going anywhere."</p>
            </div>

            <div className="pitch-section">
              <h4>Change Resistance</h4>
              <p><strong>Objection:</strong> "I'm happy with how things are."</p>
              <p><strong>Response:</strong> "That's good to hear. LocalsZA isn't about replacing what works—it's about adding an option that could save you money on bulk items while keeping your existing suppliers for everything else."</p>
            </div>
          </div>

          <div className="video-training">
            <h3>Growth Hacks Training</h3>
            <p>Learn how to reposition your offer and create demand rather than chasing customers</p>
            <button 
              onClick={() => window.open('https://www.youtube.com/watch?v=DmKgsjbWw8o', '_blank')}
              className="youtube-watch-btn"
            >
              Watch on YouTube
            </button>
          </div>

          <div className="video-training">
            <h3>Hussle Mentality</h3>
            <p>"It sounds simple telling people to work hard and never quit, but to really execute and demonstrate those principles takes discipline and faith" - Ermias "Nipsey Hussle" Joseph Asghedom</p>
            <button 
              onClick={() => window.open('https://www.youtube.com/watch?v=PyNO90edF6w', '_blank')}
              className="youtube-watch-btn"
            >
              Watch on YouTube
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HustlePage;
