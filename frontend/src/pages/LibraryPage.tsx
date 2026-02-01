import { useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CoffeeList from '@/components/library/CoffeeList';
import FilterPaperList from '@/components/library/FilterPaperList';
import MineralProfileList from '@/components/library/MineralProfileList';

type TabValue = 'coffees' | 'filter-papers' | 'mineral-profiles';

const TAB_ROUTES: Record<string, TabValue> = {
  '/library': 'coffees',
  '/library/filter-papers': 'filter-papers',
  '/library/mineral-profiles': 'mineral-profiles',
};

const ROUTE_FOR_TAB: Record<TabValue, string> = {
  coffees: '/library',
  'filter-papers': '/library/filter-papers',
  'mineral-profiles': '/library/mineral-profiles',
};

export default function LibraryPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentTab = TAB_ROUTES[location.pathname] || 'coffees';

  const handleTabChange = (value: string) => {
    const route = ROUTE_FOR_TAB[value as TabValue];
    if (route) {
      navigate(route);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-semibold mb-6">Library</h1>

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList className="mb-6">
          <TabsTrigger value="coffees">Coffees</TabsTrigger>
          <TabsTrigger value="filter-papers">Filter Papers</TabsTrigger>
          <TabsTrigger value="mineral-profiles">Mineral Profiles</TabsTrigger>
        </TabsList>

        <TabsContent value="coffees">
          <CoffeeList />
        </TabsContent>

        <TabsContent value="filter-papers">
          <FilterPaperList />
        </TabsContent>

        <TabsContent value="mineral-profiles">
          <MineralProfileList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
