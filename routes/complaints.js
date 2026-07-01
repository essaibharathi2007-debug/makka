const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Complaint = require('../models/Complaint');

// Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const isVoice = file.fieldname === 'voiceNote';
    const dir = isVoice ? 'uploads/voice' : 'uploads/images';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'voiceNote') {
      if (file.mimetype.startsWith('audio/')) cb(null, true);
      else cb(new Error('Only audio files allowed for voice note'));
    } else {
      if (file.mimetype.startsWith('image/')) cb(null, true);
      else cb(new Error('Only image files allowed'));
    }
  }
});

const uploadFields = upload.fields([
  { name: 'voiceNote', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);

// POST /api/complaints - Submit new complaint
router.post('/', uploadFields, async (req, res) => {
  try {
    const { name, phone, street, ward, address, category, title, description, language } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'மனுதாரரின் பெயரை உள்ளிடவும்.'
      });
    }

    if (!phone || phone.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'மனுதாரரின் தொலைபேசி எண்ணை உள்ளிடவும்.'
      });
    }

    if (!street || street.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'தெருவின் பெயரை உள்ளிடவும்.'
      });
    }

    if (!ward || ward.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'வார்டை தேர்வு செய்யவும்.'
      });
    }

    if (!address || address.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'முகவரியை உள்ளிடவும்.'
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'புகார் வகையை தேர்வு செய்யவும்.'
      });
    }

    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'புகாரின் தலைப்பை உள்ளிடவும்.'
      });
    }

    if (!description || description.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'புகாரின் விவரத்தை உள்ளிடவும்.'
      });
    }

    const complaintId = await Complaint.generateId();
    const normalizedTitle = (title || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\u0B80-\u0BFF]/g, '');

    const data = {
      ...req.body,
      complaintId,
      title: normalizedTitle,
      description: description.trim(),
      voiceNote: req.files?.voiceNote?.[0]?.filename || null,
      images: req.files?.images?.map(f => f.filename) || []
    };

    const existing = await Complaint.findOne({
      title: normalizedTitle,
      category,
      ward
    });

    if (existing) {
      const ip = req.ip || req.connection.remoteAddress;

      if (existing.upvotedIPs && existing.upvotedIPs.includes(ip)) {
        return res.json({
          success: true,
          duplicate: true,
          alreadyVoted: true,
          complaintId: existing.complaintId,
          upvotes: existing.upvotes,
          message: language === 'tamil'
            ? 'இந்த புகார் ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது. நீங்கள் ஏற்கனவே வாக்களித்துவிட்டீர்கள்.'
            : 'This complaint already exists. You have already voted for it.'
        });
      }

      existing.upvotes = (existing.upvotes || 0) + 1;
      if (!existing.upvotedIPs) existing.upvotedIPs = [];
      existing.upvotedIPs.push(ip);
      await existing.save();

      return res.json({
        success: true,
        duplicate: true,
        complaintId: existing.complaintId,
        upvotes: existing.upvotes,
        message: language === 'tamil'
          ? 'இந்த புகார் ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது. உங்கள் வாக்கு (vote) சேர்க்கப்பட்டது!'
          : 'This complaint already exists. Your vote has been added!'
      });
    }

    console.log('========== DATA ==========');
    console.log(data);
    console.log('==========================');

    const complaint = new Complaint(data);
    await complaint.save();

    return res.status(201).json({
      success: true,
      message: language === 'tamil'
        ? 'உங்கள் புகார் வெற்றிகரமாக பதிவு செய்யப்பட்டது!'
        : 'Your complaint has been submitted successfully!',
      complaintId,
      id: complaint._id
    });
  } catch (err) {
    console.error('========= ERROR =========');
    console.error(err);
    console.error('=========================');

    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// GET /api/complaints - List all complaints (with filters)
router.get('/', async (req, res) => {
  try {
    const { status, category, street, ward, priority, search, page = 1, limit = 10, sort = '-createdAt' } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (street) filter.street = street;
    if (ward) filter.ward = ward;
    if (priority) filter.priority = priority;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { complaintId: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Complaint.countDocuments(filter);
    const complaints = await Complaint.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('-upvotedIPs');

    res.json({
      success: true,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      complaints
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/complaints/stats - Dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const total = await Complaint.countDocuments();
    const pending = await Complaint.countDocuments({ status: 'pending' });
    const inprogress = await Complaint.countDocuments({ status: 'inprogress' });
    const resolved = await Complaint.countDocuments({ status: 'resolved' });
    const urgent = await Complaint.countDocuments({ priority: 'urgent' });

    const byCategoryRaw = await Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

   const byWard = await Complaint.aggregate([
  { $group: { _id: '$ward', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 10 }
  ]);

    res.json({
      success: true,
      stats: { total, pending, inprogress, resolved, urgent },
      byCategory: byCategoryRaw,
      byWard
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/complaints/:id - Single complaint
router.get('/:id', async (req, res) => {
  try {
    const complaint = await Complaint.findOne({
      $or: [{ _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }, { complaintId: req.params.id }]
    }).select('-upvotedIPs');

    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    // Increment views
    complaint.views += 1;
    await complaint.save();

    res.json({
    success:true,
    complaint
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/complaints/:id/upvote
router.post('/:id/upvote', async (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;

    // Atomic: only increments if this IP is NOT already in upvotedIPs.
    // This avoids the race condition where two rapid clicks both pass
    // the "already voted" check before either write completes.
    const updated = await Complaint.findOneAndUpdate(
      { _id: req.params.id, upvotedIPs: { $ne: ip } },
      { $inc: { upvotes: 1 }, $push: { upvotedIPs: ip } },
      { new: true }
    );

    if (updated) {
      return res.json({ success: true, upvotes: updated.upvotes });
    }

    // Either the complaint doesn't exist, or this IP already voted.
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Not found' });

    return res.json({ success: false, message: 'Already upvoted', upvotes: complaint.upvotes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/complaints/:id/status - Update status (admin)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, adminResponse } = req.body;
    const update = { status, adminResponse };
    if (status === 'resolved') update.resolvedAt = new Date();

    const complaint = await Complaint.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!complaint) return res.status(404).json({ success: false, message: 'Not found' });

    res.json({ success: true, complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// DELETE /api/complaints/:id
router.delete('/:id', async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndDelete(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    res.json({
      success: true,
      message: 'Complaint deleted successfully'
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

module.exports = router;