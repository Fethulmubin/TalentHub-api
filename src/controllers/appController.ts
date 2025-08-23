import prisma from "../../utils/prismaClient";

export async function getApplicationsByUser(req, res) {
  const { userId } = req.params;

  if (req.user.id !== userId) {
    return res.status(403).json({ status: false, message: "Forbidden" });
  }

  // Fetch applications for the user
  try {
    const applications = await prisma.application.findMany({
      where: { userId },
      include: {
        job: {
          select: { id: true, title: true, description: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ status: true, applications });
  } catch (error) {
    console.error("Error fetching user applications:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
}

export async function applyForJob(req, res) {
    const { jobId } = req.body;

  if (!jobId) {
    return res.status(400).json({ status: false, message: "Job ID is required" });
  }

  if (!req.file || !req.file.path) {
    return res.status(400).json({ status: false, message: "Resume PDF is required" });
  }
  try {
      // Ensure job exists
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true },
    });
    if (!job) {
      return res.status(404).json({ status: false, message: "Job not found" });
    }

     const application = await prisma.application.create({
      data: {
        jobId,
        userId: req.user.id,        // from authMiddleware
        resumeUrl: req.file.path,   // Cloudinary URL from multer-cloudinary
      },
      include: {
        job: { select: { id: true, title: true } },
      },
    });

    return res.status(201).json({
      status: true,
      message: "Application submitted successfully",
      application,
    });
  } catch (error) {
     // Handle duplicate applications
    if (error.code === "P2002") {
      return res.status(409).json({
        status: false,
        message: "You already applied to this job",
      });
    }

    console.error("Error applying for job:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
}

export async function getApplicationsByJob(req, res) {
  const { jobId } = req.params;

  try {
    if (req.user.role !== "EMPLOYER") {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        select: { createdById: true },
      });

      if (!job) {
        return res
          .status(404)
          .json({ status: false, message: "Job not found" });
      }

      if (job.createdById !== req.user.id) {
        return res.status(403).json({ status: false, message: "Forbidden" });
      }
    }

    const applications = await prisma.application.findMany({
      where: { jobId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ status: true, applications });
  } catch (error) {
    console.error("Error fetching job applications:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
}
