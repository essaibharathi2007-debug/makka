const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  complaintId: {
    type: String,
    unique: true,
    required: true
  },
  // Complainant Info
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, trim: true, default: '' },
  address: { type: String, required: true, trim: true },
  street: {
  type: String,
  required: true,
  trim: true
},
ward: {
  type: String,
  required: true,
  trim: true
},

  // Complaint Details
  category: {
    type: String,
    required: true,
  enum: [
  'road',
  'water',
  'electricity',
  'garbage',
  'drainage',
  'streetlight',
  'noise',
  'pollution',
  'corruption',
  'health',
  'transport',
  'other'
]
  },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  language: { type: String, enum: ['tamil', 'english'], default: 'tamil' },

  // Priority & Status
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'inprogress', 'resolved', 'rejected', 'closed'],
    default: 'pending'
  },

  // Media
  voiceNote: { type: String, default: null }, // file path
  images: [{ type: String }], // file paths

  // Tracking
  upvotes: { type: Number, default: 0 },
  upvotedIPs: [{ type: String }],
  views: { type: Number, default: 0 },

  // Admin response
  adminResponse: { type: String, default: '' },
  resolvedAt: { type: Date, default: null },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

  complaintSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Generate complaint ID like VMK-2024-00001
  complaintSchema.statics.generateId = async function() {
  const year = new Date().getFullYear();
  const count = await this.countDocuments();
  const padded = String(count + 1).padStart(5, '0');
  return `VMK-${year}-${padded}`;
};

module.exports = mongoose.model('Complaint', complaintSchema);
