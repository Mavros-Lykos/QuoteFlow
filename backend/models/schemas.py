from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class TradeType(str, Enum):
    PLUMBING = "Plumbing"
    ELECTRICAL = "Electrical"
    CARPENTRY = "Carpentry / Remodeling"
    HVAC = "HVAC"
    ROOFING = "Roofing"
    PAINTING = "Painting"
    GENERAL_CONTRACTING = "General Contracting"

class ModelProvider(str, Enum):
    OLLAMA = "ollama"
    GROQ = "groq"
    MOCK = "mock"

class ModelOption(BaseModel):
    id: str
    name: str
    provider: ModelProvider
    size: str
    vram_required_gb: float
    recommended_min_ram_gb: float
    description: str
    is_default: bool = False
    is_local: bool = True

class LineItem(BaseModel):
    id: Optional[str] = None
    category: str = Field(..., description="Materials, Labor, Permits, or Equipment")
    description: str
    quantity: float
    unit: str = Field(..., description="hours, sq ft, linear ft, pieces, etc.")
    unit_cost: float
    total_cost: float

class ClientInfo(BaseModel):
    name: str
    phone: Optional[str] = ""
    email: Optional[str] = ""
    address: str
    zip_code: str

class GenerateQuoteRequest(BaseModel):
    prompt: str = Field(..., description="Voice transcript or written scope of work from contractor")
    trade_type: TradeType = TradeType.PLUMBING
    client_info: Optional[ClientInfo] = None
    urgency: str = "Standard" # Standard, Rush, Emergency
    target_margin_percent: float = 30.0
    model_id: Optional[str] = "gemma3:4b"
    provider: Optional[ModelProvider] = None
    groq_api_key: Optional[str] = None
    use_live_benchmarks: bool = True
    # Locale — preferred from the device; falls back to contractor profile
    currency_code: Optional[str] = None
    currency_symbol: Optional[str] = None
    tax_percent: Optional[float] = None
    tax_label: Optional[str] = None
    units: Optional[str] = None  # imperial | metric
    hourly_rate: Optional[float] = None
    country_code: Optional[str] = None

class MarketBenchmark(BaseModel):
    trade: str
    region_zip: str
    avg_hourly_rate: float
    low_hourly_rate: float
    high_hourly_rate: float
    source: str
    retrieved_at: str

class PricingPrediction(BaseModel):
    suggested_price: float
    confidence_score: float
    recommended_range_min: float
    recommended_range_max: float
    model_used: str = "TabPFN-3.5"
    rationale: str

class Quote(BaseModel):
    id: str
    quote_number: str
    created_at: str
    client: ClientInfo
    trade_type: TradeType
    project_title: str
    project_scope_summary: str
    line_items: List[LineItem]
    subtotal_materials: float
    subtotal_labor: float
    permits_and_fees: float
    target_margin_percent: float
    tax_percent: float
    tax_amount: float
    total_amount: float
    valid_until: str
    terms_and_conditions: str
    client_proposal_prose: str
    
    # Partner tech metadata
    llm_model_used: str
    llm_provider: str
    inference_time_ms: float
    market_benchmark: Optional[MarketBenchmark] = None
    tabpfn_prediction: Optional[PricingPrediction] = None
    follow_up_workflow_scheduled: bool = False
    status: str = "draft" # draft, sent, approved, completed

class HardwareSpec(BaseModel):
    device_memory_gb: Optional[float] = None
    cpu_cores: Optional[int] = None
    gpu_detected: bool = False
    recommended_model: str

class ContractorProfile(BaseModel):
    business_name: str = ""
    contractor_name: str = ""
    phone: str = ""
    email: str = ""
    license_number: str = ""
    currency_code: str = "USD"
    currency_symbol: str = "$"
    default_hourly_rate: float = 95.0
    default_markup_percent: float = 30.0
    default_tax_percent: float = 7.5
    default_trade: str = "Plumbing"
    preferred_model_id: str = "gemma3:4b"
    terms_template: str = "50% deposit on acceptance, balance on completion. Estimate valid for 30 days."
    theme: str = "light"

