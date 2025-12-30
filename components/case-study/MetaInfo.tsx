interface MetaInfoProps {
  role: string;
  timeline: string;
  tools: string[];
  team?: string[];
}

export default function MetaInfo({ role, timeline, tools, team }: MetaInfoProps) {
  return (
    <aside className="bg-neutral-50 p-8 rounded-lg space-y-6">
      <div>
        <h3 className="font-semibold mb-2 text-sm uppercase text-neutral-500">Role</h3>
        <p className="text-neutral-900">{role}</p>
      </div>

      <div>
        <h3 className="font-semibold mb-2 text-sm uppercase text-neutral-500">Timeline</h3>
        <p className="text-neutral-900">{timeline}</p>
      </div>

      <div>
        <h3 className="font-semibold mb-2 text-sm uppercase text-neutral-500">Tools</h3>
        <ul className="space-y-1">
          {tools.map((tool) => (
            <li key={tool} className="text-neutral-900">{tool}</li>
          ))}
        </ul>
      </div>

      {team && team.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2 text-sm uppercase text-neutral-500">Team</h3>
          <ul className="space-y-1">
            {team.map((member) => (
              <li key={member} className="text-neutral-900">{member}</li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
