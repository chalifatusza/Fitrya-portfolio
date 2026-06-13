const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

// Supabase client initialization
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'my-porto';

if (!supabaseUrl || !supabaseKey) {
  console.warn('WARNING: SUPABASE_URL and SUPABASE_KEY are not fully configured in the environment.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow uploading large base64 images

// Lazily ensure default admin exists in Supabase porto_admins table
let adminChecked = false;
const ensureDefaultAdmin = async () => {
  try {
    const { data, error } = await supabase
      .from('porto_admins')
      .select('*')
      .eq('username', 'Fitrya')
      .limit(1);

    if (error) {
      console.error('Error fetching admin:', error);
      return;
    }

    if (!data || data.length === 0) {
      const hashedPassword = await bcrypt.hash('Fitrya11', 10);
      const { error: insertError } = await supabase
        .from('porto_admins')
        .insert([{ username: 'Fitrya', password: hashedPassword }]);

      if (insertError) {
        console.error('Error creating default admin:', insertError);
      } else {
        console.log('Default admin created: Fitrya/Fitrya11');
      }
    }
  } catch (err) {
    console.error('Failed to ensure default admin:', err);
  }
};

const checkAdmin = async () => {
  if (!adminChecked) {
    await ensureDefaultAdmin();
    adminChecked = true;
  }
};

// Middleware auth
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
    req.adminId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ============ ROUTER CONFIGURATION ============
const router = express.Router();

// ============ SUPABASE STORAGE UPLOAD ENDPOINTS ============

// Upload image to Supabase Storage
router.post('/upload', authMiddleware, async (req, res) => {
  const { image } = req.body; // base64 string
  
  if (!image) {
    return res.status(400).json({ error: 'No image provided' });
  }
  
  try {
    // Parse base64
    const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid base64 image format' });
    }
    const contentType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Generate unique name
    const extension = contentType.split('/')[1] || 'png';
    const fileName = `project_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${extension}`;
    
    // Upload buffer to Supabase public bucket
    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(fileName, buffer, {
        contentType: contentType,
        upsert: true
      });
      
    if (error) {
      throw error;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(fileName);
      
    res.json({ 
      url: urlData.publicUrl,
      public_id: fileName 
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

// Delete image from Supabase Storage
router.delete('/upload/:public_id', authMiddleware, async (req, res) => {
  const { public_id } = req.params; // fileName
  
  try {
    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .remove([public_id]);
      
    if (error) {
      throw error;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Delete failed: ' + err.message });
  }
});

// ============ PORTFOLIO CRUD ============

// Get all portfolios (public)
router.get('/portfolio', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('porto_portfolios')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const portfolios = data.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      imageUrl: p.image_url,
      imagePublicId: p.image_name,
      projectUrl: p.project_url,
      technologies: Array.isArray(p.technologies) ? p.technologies : (typeof p.technologies === 'string' ? JSON.parse(p.technologies) : []),
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));
    res.json(portfolios);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Create portfolio (admin only)
router.post('/portfolio', authMiddleware, async (req, res) => {
  const { title, description, imageUrl, imagePublicId, technologies, projectUrl } = req.body;
  try {
    const { data, error } = await supabase
      .from('porto_portfolios')
      .insert([
        {
          title,
          description,
          image_url: imageUrl,
          image_name: imagePublicId || null,
          project_url: projectUrl,
          technologies: Array.isArray(technologies) ? technologies : []
        }
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    const portfolio = data;
    res.json({
      id: portfolio.id,
      title: portfolio.title,
      description: portfolio.description,
      imageUrl: portfolio.image_url,
      imagePublicId: portfolio.image_name,
      projectUrl: portfolio.project_url,
      technologies: Array.isArray(portfolio.technologies) ? portfolio.technologies : [],
      createdAt: portfolio.created_at,
      updatedAt: portfolio.updated_at,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Update portfolio (admin only)
router.put('/portfolio/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { title, description, imageUrl, imagePublicId, technologies, projectUrl } = req.body;
  try {
    // Get old image name for cleanup if we are updating the image
    if (imagePublicId) {
      const { data: oldData, error: oldError } = await supabase
        .from('porto_portfolios')
        .select('image_name')
        .eq('id', id)
        .single();
      
      if (!oldError && oldData?.image_name && oldData.image_name !== imagePublicId) {
        // Remove old file from Supabase Storage
        await supabase.storage
          .from(SUPABASE_BUCKET)
          .remove([oldData.image_name]);
      }
    }

    const { data, error } = await supabase
      .from('porto_portfolios')
      .update({
        title,
        description,
        image_url: imageUrl,
        image_name: imagePublicId || null,
        project_url: projectUrl,
        technologies: Array.isArray(technologies) ? technologies : []
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    const portfolio = data;
    res.json({
      id: portfolio.id,
      title: portfolio.title,
      description: portfolio.description,
      imageUrl: portfolio.image_url,
      imagePublicId: portfolio.image_name,
      projectUrl: portfolio.project_url,
      technologies: Array.isArray(portfolio.technologies) ? portfolio.technologies : [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Delete portfolio (admin only)
router.delete('/portfolio/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    // Get image name to clean up storage
    const { data: oldData, error: oldError } = await supabase
      .from('porto_portfolios')
      .select('image_name')
      .eq('id', id)
      .single();

    if (!oldError && oldData?.image_name) {
      await supabase.storage
        .from(SUPABASE_BUCKET)
        .remove([oldData.image_name]);
    }

    const { error } = await supabase
      .from('porto_portfolios')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Auth login endpoint
router.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    await checkAdmin();
    const { data, error } = await supabase
      .from('porto_admins')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error || !data) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const admin = data;
    const validPassword = await bcrypt.compare(password, admin.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET || 'secretkey',
      { expiresIn: '1d' }
    );
    res.json({ token, username: admin.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Health check
router.get('/health', async (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Mount router on both paths
app.use('/api', router);
app.use('/', router);

// Local server listener for direct execution
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Local Express backend listening on port ${PORT}`);
  });
}

// Export express app for Vercel serverless function
module.exports = app;
