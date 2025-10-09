# Twilio SMS Integration Guide

## 📱 Phone Number Format Requirements

### Why Phone Numbers Need Country Codes

Twilio requires phone numbers to be in **E.164 format**, which includes:
- A plus sign (`+`)
- Country code (1-3 digits)
- National number (up to 15 digits total)

### Examples of Valid Formats

```
✅ CORRECT FORMATS:
+91 9876543210    (India)
+1 5551234567     (US/Canada)
+44 7911123456    (UK)
+86 13812345678   (China)

❌ INCORRECT FORMATS:
9876543210        (Missing country code)
91 9876543210     (Missing + prefix)
+919876543210     (Valid but hard to read)
```

## 🔧 Implementation Details

### Automatic Phone Number Formatting

The system now automatically:

1. **Validates** phone numbers in real-time as you type
2. **Formats** numbers by adding country codes when missing
3. **Assumes Indian numbers** (+91) for 10-digit numbers without country code
4. **Stores both** original and formatted versions in the database

### Form Improvements

- ✅ Real-time validation with visual feedback
- ✅ Clear placeholder examples
- ✅ Helpful error messages
- ✅ Auto-formatting for common cases

## 🚀 Testing Your SMS Setup

### 1. Environment Variables
Make sure your `.env` file contains:
```env
VITE_TWILIO_ACCOUNT_SID=your_account_sid
VITE_TWILIO_AUTH_TOKEN=your_auth_token
VITE_TWILIO_PHONE_NUMBER=+1234567890
```

### 2. Phone Number Input Examples

**For Indian Users:**
- Input: `9876543210` → Auto-formatted to: `+91 9876543210`
- Input: `+91 9876543210` → Already correct format

**For US Users:**
- Input: `+1 5551234567` → Correct format
- Input: `5551234567` → Needs manual country code

**For Other Countries:**
- Always include the country code: `+44 7911123456` (UK)

### 3. Testing SMS Delivery

1. **Create a queue entry** with a properly formatted phone number
2. **Go to Admin Dashboard** (`/admin`)
3. **Use SMS buttons** to send test messages:
   - 📱 Individual SMS
   - 📍 Position updates
   - 🚨 Emergency broadcast

### 4. Check SMS Logs

SMS attempts are logged in Firebase under `sms_logs` collection with:
- Original and formatted phone numbers
- Success/failure status
- Error messages (if any)
- Timestamp and delivery details

## 🐛 Troubleshooting

### Common Issues

**Issue: "Message sent but not received"**
- ✅ **Solution**: Ensure phone number includes country code
- ✅ **Check**: Console logs for formatting details
- ✅ **Verify**: SMS logs in Firebase for delivery status

**Issue: "Invalid phone number format"**
- ✅ **Solution**: Use E.164 format with + and country code
- ✅ **Example**: `+91 9876543210` not `9876543210`

**Issue: SMS shows as sent but not delivered**
- ✅ **Check**: Twilio console for delivery status
- ✅ **Verify**: Phone number is active and can receive SMS
- ✅ **Confirm**: Twilio account has sufficient credits

### Console Debugging

The system now provides detailed logging:
```javascript
📞 Original contact: 9876543210
📞 Formatted contact: +91 9876543210
🔍 Validating phone number: +91 9876543210
📞 Phone validation result: { original: "+91 9876543210", cleaned: "+919876543210", isValid: true }
📱 Formatting phone number: +91 9876543210
✅ Final formatted number: +919876543210
```

## 🌍 Country Code Reference

| Country | Code | Example |
|---------|------|---------|
| India | +91 | +91 9876543210 |
| United States | +1 | +1 5551234567 |
| United Kingdom | +44 | +44 7911123456 |
| Canada | +1 | +1 4161234567 |
| Australia | +61 | +61 412345678 |
| Germany | +49 | +49 17612345678 |
| France | +33 | +33 612345678 |
| Japan | +81 | +81 9012345678 |
| China | +86 | +86 13812345678 |

## 📋 Next Steps

1. **Test with real phone numbers** to verify SMS delivery
2. **Monitor SMS logs** in Firebase for delivery issues
3. **Update Twilio webhook URLs** for delivery status updates
4. **Implement SMS templates** for different notification types
5. **Add SMS preferences** for patients (opt-in/opt-out)

## 🔐 Security Notes

- Phone numbers are stored in E.164 format for consistency
- Original input is preserved for reference
- SMS logs include delivery status for compliance
- Failed SMS attempts are logged with error details

---

**Need Help?** Check the browser console for detailed SMS formatting and delivery logs.