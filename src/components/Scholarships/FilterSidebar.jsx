import { useState } from 'react'
import { useFilters } from '../../hooks/useFilters'
import { useScholarships } from '../../hooks/useScholarships'
import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import { Label } from '../ui/label'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { COUNTRIES, FIELDS_OF_STUDY, DEADLINE_FILTERS, FUNDING_TYPES, MATCH_SCORE_FILTERS } from '../../utils/constants'
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react'

const FilterSection = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  
  return (
    <div className="border-b border-gray-200 py-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-2 text-sm font-medium text-gray-900 hover:text-primary-500"
      >
        <span>{title}</span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {isOpen && <div className="mt-3">{children}</div>}
    </div>
  )
}

const FilterSidebar = () => {
  const {
    filters,
    toggleCountryFilter,
    toggleFieldFilter,
    updateExcludeIELTS,
    updateExcludeAppFee,
    updateDeadline,
    updateFundingType,
    updateMinMatchScore,
    clearAllFilters,
  } = useFilters()
  
  const { loadScholarships } = useScholarships()
  const [showMoreCountries, setShowMoreCountries] = useState(false)
  const [showMoreFields, setShowMoreFields] = useState(false)

  const handleApplyFilters = () => {
    loadScholarships()
  }

  const displayedCountries = showMoreCountries ? COUNTRIES : COUNTRIES.slice(0, 8)
  const displayedFields = showMoreFields ? FIELDS_OF_STUDY : FIELDS_OF_STUDY.slice(0, 6)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={clearAllFilters}>
          Clear All
        </Button>
      </div>

      <FilterSection title="Critical Filters">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="excludeIELTS"
              checked={filters.excludeIELTS}
              onCheckedChange={(checked) => updateExcludeIELTS(checked)}
            />
            <Label htmlFor="excludeIELTS" className="text-sm cursor-pointer">
              Exclude IELTS Requirement
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="excludeAppFee"
              checked={filters.excludeAppFee}
              onCheckedChange={(checked) => updateExcludeAppFee(checked)}
            />
            <Label htmlFor="excludeAppFee" className="text-sm cursor-pointer">
              Exclude Application Fees
            </Label>
          </div>
        </div>
      </FilterSection>

      <FilterSection title="Profile Match">
        <RadioGroup
          value={String(filters.minMatchScore)}
          onValueChange={(value) => updateMinMatchScore(parseInt(value))}
          className="space-y-2"
        >
          {MATCH_SCORE_FILTERS.map((filter) => (
            <div key={filter.value} className="flex items-center space-x-2">
              <RadioGroupItem value={String(filter.value)} id={`match-${filter.value}`} />
              <Label htmlFor={`match-${filter.value}`} className="text-sm cursor-pointer">
                {filter.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </FilterSection>

      <FilterSection title="Funding Type">
        <RadioGroup
          value={String(filters.fundingType)}
          onValueChange={(value) => updateFundingType(value)}
          className="space-y-2"
        >
          {FUNDING_TYPES.map((type) => (
            <div key={type.value} className="flex items-center space-x-2">
              <RadioGroupItem value={type.value} id={type.value} />
              <Label htmlFor={type.value} className="text-sm cursor-pointer">
                {type.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </FilterSection>

      <FilterSection title="Deadline">
        <RadioGroup
          value={String(filters.deadlineFilter)}
          onValueChange={(value) => updateDeadline(value)}
          className="space-y-2"
        >
          {DEADLINE_FILTERS.map((filter) => (
            <div key={filter.value} className="flex items-center space-x-2">
              <RadioGroupItem value={filter.value} id={filter.value} />
              <Label htmlFor={filter.value} className="text-sm cursor-pointer">
                {filter.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </FilterSection>

      <Button onClick={handleApplyFilters} className="w-full mt-4 bg-black text-white">
        Apply Filters
      </Button>
    </div>
  )
}

export default FilterSidebar
