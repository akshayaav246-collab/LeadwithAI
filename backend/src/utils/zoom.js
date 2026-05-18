const axios = require('axios');

/**
 * Get Server-to-Server OAuth Access Token from Zoom
 */
async function getZoomAccessToken() {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    throw new Error('Zoom credentials not configured');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const response = await axios.post(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
      null,
      {
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error('Error fetching Zoom access token:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with Zoom');
  }
}

/**
 * Register a user for a Zoom Webinar
 * @param {string} email 
 * @param {string} firstName 
 * @param {string} lastName 
 * @returns {Promise<string>} The unique join URL
 */
async function registerForWebinar(email, firstName, lastName) {
  const webinarId = process.env.ZOOM_WEBINAR_ID;
  if (!webinarId) {
    throw new Error('Zoom webinar ID not configured');
  }

  const token = await getZoomAccessToken();

  try {
    const response = await axios.post(
      `https://api.zoom.us/v2/webinars/${webinarId}/registrants`,
      {
        email,
        first_name: firstName || 'Attendee',
        last_name: lastName || '-',
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Zoom API returns a `join_url` for the unique registrant
    return response.data.join_url;
  } catch (error) {
    console.error('Error registering for Zoom webinar:', error.response?.data || error.message);
    throw new Error('Failed to register user to Zoom Webinar');
  }
}

module.exports = {
  registerForWebinar,
};
