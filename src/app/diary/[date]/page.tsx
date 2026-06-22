import DiaryPage from '@/components/DiaryPage';

export default async function Page({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  return <DiaryPage date={date} />;
}
