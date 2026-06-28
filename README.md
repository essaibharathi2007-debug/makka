# 📢  மக்கள் குரல் (Vandhu Makkal Kural)

> உங்கள் பகுதியில் உள்ள சிக்கல்களை புகாரளிக்கும் தளம்
> A local civic complaint portal with Tamil & English support

---

## 🚀 தொடக்க வழிமுறை (Setup Instructions)

### தேவையான software:
- **Node.js** (v18+) → https://nodejs.org
- **MongoDB Community** → https://www.mongodb.com/try/download/community
- **MongoDB Compass** (UI tool) → https://www.mongodb.com/try/download/compass

---

### படி 1: Dependencies நிறுவு

```bash
cd vandhu-makkal-kural
npm install
```

---

### படி 2: MongoDB இயக்கு

**Windows:**
```bash
# MongoDB service start
net start MongoDB

# அல்லது
mongod --dbpath C:\data\db
```

**Mac/Linux:**
```bash
brew services start mongodb-community
# அல்லது
sudo systemctl start mongod
```

---

### படி 3: Server இயக்கு

```bash
npm start
```

Browser-ல் திற: **http://localhost:3000**

---

### படி 4: MongoDB Compass-ல் பார்க்க

1. MongoDB Compass திற
2. Connection string: `mongodb://localhost:27017`
3. Connect பண்ணு
4. Database: `vandhu-makkal-kural`
5. Collection: `complaints` - எல்லா புகார்களும் இங்கே தெரியும்!

---

## ✨ Features

| Feature | விவரம் |
|---------|--------|
| 🌐 Bilingual | Tamil + English toggle |
| 📝 Complaint Form | Personal info + category + priority |
| 🎙️ Voice Note | Record & attach voice complaints |
| 📷 Images | Up to 3 photos per complaint |
| 🔍 Track Status | Track by complaint ID |
| 👍 Upvotes | Community support voting |
| 📊 Live Stats | Real-time dashboard |
| 🛡️ Admin Panel | Update status + respond |
| 🔎 Filter & Search | Filter by status, category, district |
| 📱 Responsive | Mobile-friendly |

---

## 📁 File Structure

```
vandhu-makkal-kural/
├── server.js           ← Express server
├── package.json
├── .env                ← MongoDB URI config
├── models/
│   └── Complaint.js    ← MongoDB schema
├── routes/
│   └── complaints.js   ← API routes
├── public/
│   ├── index.html      ← Frontend
│   ├── css/style.css
│   └── js/app.js
└── uploads/
    ├── voice/          ← Voice notes stored here
    └── images/         ← Complaint images here
```

---

## 🔌 API Endpoints

| Method | URL | விவரம் |
|--------|-----|--------|
| POST | `/api/complaints` | புகார் சமர்ப்பி |
| GET | `/api/complaints` | எல்லா புகார்களும் |
| GET | `/api/complaints/stats` | Statistics |
| GET | `/api/complaints/:id` | ஒரு புகார் |
| POST | `/api/complaints/:id/upvote` | Upvote |
| PATCH | `/api/complaints/:id/status` | Admin update |

---

## 🌐 Deploy பண்ண

### Render.com (Free):
1. GitHub-ல் upload பண்ணு
2. render.com-ல் Web Service create பண்ணு
3. MongoDB Atlas free cluster உருவாக்கு
4. `.env`-ல் MONGODB_URI மாற்று

### Railway.app:
```bash
railway login
railway init
railway up
```

---

## 📞 Support

Essaibharathi, Tirunelveli-ல் develop செய்யப்பட்டது 🇮🇳
