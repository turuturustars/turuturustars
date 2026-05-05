import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Medal, Award } from 'lucide-react';
import type { KittyTopContributorRow } from '@/hooks/useKitties';

interface Props {
  kittyId?: string; // when undefined → all kitties
  limit?: number;
  title?: string;
}

const RANK_ICON = (i: number) => {
  if (i === 0) return <Trophy className="w-4 h-4 text-amber-500" />;
  if (i === 1) return <Medal className="w-4 h-4 text-slate-400" />;
  if (i === 2) return <Award className="w-4 h-4 text-amber-700" />;
  return <span className="text-xs font-semibold text-muted-foreground w-4 text-center">{i + 1}</span>;
};

const KittyTopContributors = ({ kittyId, limit = 10, title }: Props) => {
  const [rows, setRows] = useState<KittyTopContributorRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const view = kittyId ? 'kitty_top_contributors_per_kitty_v' : 'kitty_top_contributors_v';
      let q = supabase
        .from(view as never)
        .select('*')
        .order('total_amount', { ascending: false })
        .limit(limit);
      if (kittyId) q = q.eq('kitty_id', kittyId);
      const { data } = await q;
      setRows((data as unknown as KittyTopContributorRow[]) || []);
      setLoading(false);
    })();
  }, [kittyId, limit]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          {title || (kittyId ? 'Top Contributors (this kitty)' : 'Top Contributors (all kitties)')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No contributions yet.</p>
        ) : (
          rows.map((r, i) => (
            <div key={`${r.member_id}-${i}`} className="flex items-center gap-3 py-1.5 border-b last:border-0">
              <div className="w-6 flex justify-center">{RANK_ICON(i)}</div>
              {r.photo_url ? (
                <img src={r.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                  {(r.full_name || 'M').charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.full_name || 'Member'}</p>
                <p className="text-xs text-muted-foreground">
                  {r.membership_number || '—'} • {r.contribution_count} contribution{r.contribution_count !== 1 ? 's' : ''}
                </p>
              </div>
              <p className="text-sm font-bold text-primary whitespace-nowrap">
                KES {Number(r.total_amount).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default KittyTopContributors;
