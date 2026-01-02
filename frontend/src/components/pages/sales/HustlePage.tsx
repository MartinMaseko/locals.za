import '../buyers/buyerStyles.css';

const HustlePage = () => {
  return (
    <div className="buyer-dashboard">
      <div className="buyer-section">
        <h2 style={{ 
          textAlign: 'center', 
          color: '#212121', 
          fontSize: '2.5rem',
          marginBottom: '1rem'
        }}>
          Skills Training
        </h2>
        <p style={{ 
          textAlign: 'center', 
          color: '#666', 
          fontSize: '1.1rem',
          marginBottom: '2rem'
        }}>
          Coming Soon - Level up your sales game!
        </p>
        
        <div style={{
          display: 'grid',
          gap: '1.5rem',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <div style={{
            padding: '2rem',
            background: 'linear-gradient(135deg, #ffb803 0%, #ffc933 100%)',
            borderRadius: '12px',
            color: '#212121',
            textAlign: 'center'
          }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>🎯 Sales Mastery</h3>
            <p>Learn advanced techniques to close more deals and grow your customer base</p>
          </div>

          <div style={{
            padding: '2rem',
            background: 'linear-gradient(135deg, #212121 0%, #3a3a3a 100%)',
            borderRadius: '12px',
            color: '#ffb803',
            textAlign: 'center'
          }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>💼 Business Development</h3>
            <p>Discover strategies to build lasting relationships with your clients</p>
          </div>

          <div style={{
            padding: '2rem',
            background: '#f8f9fa',
            borderRadius: '12px',
            border: '2px solid #ffb803',
            textAlign: 'center'
          }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.5rem', color: '#212121' }}>📈 Growth Hacks</h3>
            <p style={{ color: '#666' }}>Unlock proven methods to maximize your earnings potential</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HustlePage;
