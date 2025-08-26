import prisma from "../../utils/prismaClient";

// fetching all jobs
export async function getJobs(req, res) {
  const { search, skill, title } = req.query;
  
  const filters: any = {};

  if (search) {
    filters.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (skill) {
    filters.skills = {
      some: { name: { contains: skill, mode: "insensitive" } },
    };
  }

  if (title) {
    filters.title = { contains: title, mode: "insensitive" };
  }

  try {
    const jobs = await prisma.job.findMany({
      where: filters,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        skills: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ status: true, jobs });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
}

// search jobs with skills
// export async function searchJobs(req, res) {
//   const { skill } = req.query;
//   try {
//     const jobs = await prisma.job.findMany({
//       where: skill
//         ? {
//             skills: {
//               some: { name: { contains: skill, mode: "insensitive" } },
//             },
//           }
//         : {},
//       include: { skills: true, createdBy: true },
//     });

//     return res.json({ status: true, jobs });
//   } catch (error) {
//     console.error("Error searching jobs:", error);
//     return res
//       .status(500)
//       .json({ status: false, message: "Internal server error" });
//   }
// }

// creating job
export async function createJob(req, res) {
  const { title, description, skills, price } = req.body; // skills = ["React", "Node.js"]
  try {
    const job = await prisma.job.create({
      data: {
        title,
        description,
        createdById: req.user.id,
        price: price,
        skills: {
          connectOrCreate: skills.map((skill) => ({
            where: { name: skill },
            create: { name: skill },
          })),
        },
      },
      include: { skills: true },
    });

    return res.status(201).json({
      status: true,
      message: "Job created successfully",
      job,
    });
  } catch (error) {
    console.error("Error creating job:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
}

// get jobs by Id
export async function getJobById(req, res) {
  const { jobId } = req.params;

  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        skills: true,
      },
    });

    if (!job) {
      return res.status(404).json({ status: false, message: "Job not found" });
    }

    return res.json({ status: true, job });
  } catch (error) {
    console.error("Error fetching job by ID:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
}

// getting jobs with createdById
export async function getJobsByUserId(req, res) {
  const { userId } = req.params;

  try {
    const jobs = await prisma.job.findMany({
      where: { createdById: userId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        skills: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ status: true, jobs });
  } catch (error) {
    console.error("Error fetching jobs by user ID:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
}