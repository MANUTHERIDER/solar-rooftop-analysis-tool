// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import './index.css'; // Import the Tailwind CSS base (or App.css if you merge)

function App() {
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [assessmentResult, setAssessmentResult] = useState(null);

  // Function to handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setAssessmentResult(null);
    setLoading(true);

    // Basic validation
    if (!address || !latitude || !longitude) {
      setError('Please fill in all fields (Address, Latitude, Longitude).');
      setLoading(false);
      return;
    }

    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);

    if (isNaN(latNum) || isNaN(lonNum)) {
      setError('Latitude and Longitude must be valid numbers.');
      setLoading(false);
      return;
    }

    try {
      // Make the POST request to your Node.js backend
      const response = await fetch('http://localhost:5000/api/solar-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address,
          latitude: latNum,
          longitude: lonNum,
          // userId: null // Optionally send userId if user is logged in
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Something went wrong on the server.');
      }

      const data = await response.json();
      setAssessmentResult(data.data); // 'data' field holds the actual AI and solar results
      console.log('Assessment successful:', data);

    } catch (err) {
      console.error('Assessment failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10">
      <h1 className="text-4xl font-bold text-gray-800 mb-8">Solar Rooftop Analysis Tool</h1>
      <p className="text-lg text-gray-600 mb-10 text-center max-w-2xl">
        Enter an address with its corresponding approximate latitude and longitude to get an AI-powered solar potential assessment,
        including image analysis, recommendations, and ROI estimates.
      </p>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md mb-8">
        <div className="mb-4">
          <label htmlFor="address" className="block text-gray-700 text-sm font-bold mb-2">Address:</label>
          <input
            type="text"
            id="address"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g., 1600 Amphitheatre Parkway, Mountain View"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="latitude" className="block text-gray-700 text-sm font-bold mb-2">Latitude:</label>
          <input
            type="text"
            id="latitude"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            placeholder="e.g., 37.422"
            required
          />
        </div>
        <div className="mb-6">
          <label htmlFor="longitude" className="block text-gray-700 text-sm font-bold mb-2">Longitude:</label>
          <input
            type="text"
            id="longitude"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            placeholder="e.g., -122.084"
            required
          />
        </div>
        <button
          type="submit"
          className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={loading}
        >
          {loading ? 'Analyzing Rooftop...' : 'Get Solar Assessment'}
        </button>
      </form>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative w-full max-w-md mb-8" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline ml-2">{error}</span>
        </div>
      )}

      {assessmentResult && (
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-4xl">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Solar Assessment Results:</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-blue-50 p-4 rounded-md">
              <h3 className="text-xl font-semibold text-blue-800 mb-2">Overall Summary</h3>
              <p><strong>Address:</strong> {assessmentResult.request_details?.address}</p>
              <p><strong>Estimated System Size:</strong> {assessmentResult.solar_financial_analysis?.estimated_system_size_kw} kW</p>
              <p><strong>Estimated Annual Production:</strong> {assessmentResult.solar_financial_analysis?.estimated_annual_kwh_production} kWh</p>
              <p><strong>Solar Potential Rating:</strong> <span className={`font-semibold ${assessmentResult.solar_financial_analysis?.solar_potential_rating === 'High' ? 'text-green-600' : assessmentResult.solar_financial_analysis?.solar_potential_rating === 'Medium' ? 'text-yellow-600' : 'text-red-600'}`}>{assessmentResult.solar_financial_analysis?.solar_potential_rating}</span></p>
              <p><strong>AI Confidence:</strong> {assessmentResult.ai_image_analysis?.confidence_score_percent}%</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-md">
              <h3 className="text-xl font-semibold text-green-800 mb-2">ROI & Cost Analysis</h3>
              <p><strong>Total Installation Cost:</strong> ${assessmentResult.solar_financial_analysis?.cost_analysis?.total_installation_cost_usd?.toLocaleString()}</p>
              <p><strong>Net Cost After Incentives:</strong> ${assessmentResult.solar_financial_analysis?.cost_analysis?.net_cost_after_incentives_usd?.toLocaleString()}</p>
              <p><strong>Estimated Payback Period:</strong> {assessmentResult.solar_financial_analysis?.roi_analysis?.payback_period_years} years</p>
              <p><strong>Annual Electricity Savings:</strong> ${assessmentResult.solar_financial_analysis?.cost_analysis?.estimated_annual_electricity_savings_usd?.toLocaleString()}</p>
              <p><strong>ROI Over Lifespan:</strong> ${assessmentResult.solar_financial_analysis?.roi_analysis?.roi_over_lifespan_usd?.toLocaleString()} ({assessmentResult.solar_financial_analysis?.roi_analysis?.roi_percentage}%)</p>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-md mb-6">
            <h3 className="text-xl font-semibold text-yellow-800 mb-2">AI Rooftop Image Analysis</h3>
            <p><strong>Shape:</strong> {assessmentResult.ai_image_analysis?.rooftop_shape}</p>
            <p><strong>Usable Area:</strong> {assessmentResult.ai_image_analysis?.approx_usable_area_sqm} sqm</p>
            <p><strong>Dominant Orientation:</strong> {assessmentResult.ai_image_analysis?.dominant_orientation}</p>
            <p><strong>Shading Level:</strong> {assessmentResult.ai_image_analysis?.shading_level}</p>
            {assessmentResult.ai_image_analysis?.shading_sources?.length > 0 && (
                <p><strong>Shading Sources:</strong> {assessmentResult.ai_image_analysis?.shading_sources.join(', ')}</p>
            )}
            {assessmentResult.ai_image_analysis?.visible_obstructions?.length > 0 && (
                <p><strong>Obstructions:</strong> {assessmentResult.ai_image_analysis?.visible_obstructions.join(', ')}</p>
            )}
            <p><strong>Layout Suggestion:</strong> {assessmentResult.ai_image_analysis?.panel_layout_suggestion}</p>
            <p><strong>Feasibility Notes:</strong> {assessmentResult.ai_image_analysis?.preliminary_feasibility_notes}</p>
            <p><strong>Estimated Max Panels:</strong> {assessmentResult.ai_image_analysis?.estimated_max_panel_count}</p>
            <p><strong>Is Suitable:</strong> {assessmentResult.ai_image_analysis?.is_suitable_for_solar ? 'Yes' : 'No'}</p>
          </div>
          
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Raw JSON Output (for detailed inspection):</h3>
          <pre className="bg-gray-800 text-white p-4 rounded-lg overflow-x-auto text-sm">
            {JSON.stringify(assessmentResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default App;