import { getAllProjects } from '@/lib/projects';
import ProjectCard from './ProjectCard';

export default function ProjectGrid() {
  const projects = getAllProjects();

  return (
    <div className="grid gap-16 md:gap-20">
      {projects.map((project, index) => (
        <ProjectCard key={project.id} project={project} index={index} />
      ))}
    </div>
  );
}
