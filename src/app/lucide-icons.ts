import { importProvidersFrom } from '@angular/core';
import {
  LucideAngularModule,
  Activity, AlertCircle, AlertOctagon, AlertTriangle, AlignLeft, Archive, ArchiveX,
  ArrowDown, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowUp, ArrowUpDown, Atom, Award,
  BadgeCheck, Banknote, Barcode, BarChart3, Beaker, Bell, BellOff, BellRing, BookOpen,
  Briefcase, Bug, Building2, Calculator, Calendar, CalendarCheck, CalendarCheck2, CalendarClock,
  CalendarDays, CalendarPlus, CalendarX, CalendarX2, Camera, ChartBar,
  Check, CheckCircle, CheckCircle2, CheckSquare, ChevronDown, ChevronLeft,
  ChevronRight, ChevronsDownUp, ChevronsUpDown, CircleDollarSign,
  ClipboardCheck, ClipboardEdit, ClipboardList, Clock, Compass, CreditCard, Crown, Download,
  Edit, ExternalLink, Eye, EyeOff, File, FileBarChart, FileCheck, FileCheck2, FileDown,
  FilePlus, FilePlus2, FileQuestion, FileSearch, FileSignature,
  FileSpreadsheet, FileText, FileX, Filter, FlaskConical, FolderArchive,
  FolderOpen, Factory, Gauge, GitBranch, GraduationCap, GripVertical, Hammer, HeartPulse,
  HelpCircle, History, IdCard, Image, ImagePlus, Inbox, Infinity, Info, Layers,
  LayoutGrid, Leaf, LineChart, ListChecks, Loader, Loader2, LoaderCircle, Locate,
  LocateFixed, Lock, Mail, MapPin, MapPinCheck, MapPinHouse, MapPinned, MessageSquare,
  Minus, MoreVertical, Move, Navigation, Network, NotebookPen, Package,
  Paperclip, PenLine, Pencil, Phone, PieChart, Plane, Play, PlayCircle, Plus,
  Power, Printer, QrCode, RefreshCw, RotateCcw, Route, Save, ScanLine, Search, Send,
  Settings, Sheet, ShieldAlert, Sparkles, Sprout, Star, Table, Target, TestTube, Thermometer,
  TimerReset, Trash2, TrendingDown, TrendingUp, TriangleAlert, Upload,
  UploadCloud, User, UserCheck, UserMinus, UserPlus, UserX, Users, Wallet,
  Workflow, Wrench, X, XCircle, Zap,
  // ─── Stock v2 (7.3) ───
  Boxes, Warehouse, PackagePlus, PackageMinus, PackageSearch, PackageOpen,
  ShoppingCart, Truck, Container, FolderTree, ClipboardX, Scale, PackageX,
  // ─── Stock v2 (7.4 Contrôle des mouvements) ───
  FileInput, FileOutput, SlidersHorizontal, Tags, PackageCheck,
  // ─── Stock v2 (7.5 Analyse des consommations) ───
  CalendarRange, ChartColumn, ChartPie, Grid3x3, HardHat, Gift, Coins, CircleCheck,
  // ─── Stock v2 (7.6 Valorisation financière) ───
  Percent, Receipt, ChevronUp,
} from 'lucide-angular';

// Ajouter ici toute nouvelle icône référencée par <lucide-icon name="..."> dans les templates.
export const LucideIconsProvider = importProvidersFrom(
  LucideAngularModule.pick({
    Activity, AlertCircle, AlertOctagon, AlertTriangle, AlignLeft, Archive, ArchiveX,
    ArrowDown, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowUp, ArrowUpDown, Atom, Award,
    BadgeCheck, Banknote, Barcode, BarChart3, Beaker, Bell, BellOff, BellRing, BookOpen,
    Briefcase, Bug, Building2, Calculator, Calendar, CalendarCheck, CalendarCheck2, CalendarClock,
    CalendarDays, CalendarPlus, CalendarX, CalendarX2, Camera, ChartBar,
    Check, CheckCircle, CheckCircle2, CheckSquare, ChevronDown, ChevronLeft,
    ChevronRight, ChevronsDownUp, ChevronsUpDown, CircleDollarSign,
    ClipboardCheck, ClipboardEdit, ClipboardList, Clock, Compass, CreditCard, Crown, Download,
    Edit, ExternalLink, Eye, EyeOff, File, FileBarChart, FileCheck, FileCheck2, FileDown,
    FilePlus, FilePlus2, FileQuestion, FileSearch, FileSignature,
    FileSpreadsheet, FileText, FileX, Filter, FlaskConical, FolderArchive,
    FolderOpen, Factory, Gauge, GitBranch, GraduationCap, GripVertical, Hammer, HeartPulse,
    HelpCircle, History, IdCard, Image, ImagePlus, Inbox, Infinity, Info, Layers,
    LayoutGrid, Leaf, LineChart, ListChecks, Loader, Loader2, LoaderCircle, Locate,
    LocateFixed, Lock, Mail, MapPin, MapPinCheck, MapPinHouse, MapPinned, MessageSquare,
    Minus, MoreVertical, Move, Navigation, Network, NotebookPen, Package,
    Paperclip, PenLine, Pencil, Phone, PieChart, Plane, Play, PlayCircle, Plus,
    Power, Printer, QrCode, RefreshCw, RotateCcw, Route, Save, ScanLine, Search, Send,
    Settings, Sheet, ShieldAlert, Sparkles, Sprout, Star, Table, Target, TestTube, Thermometer,
    TimerReset, Trash2, TrendingDown, TrendingUp, TriangleAlert, Upload,
    UploadCloud, User, UserCheck, UserMinus, UserPlus, UserX, Users, Wallet,
    Workflow, Wrench, X, XCircle, Zap,
    // ─── Stock v2 (7.3) ───
    Boxes, Warehouse, PackagePlus, PackageMinus, PackageSearch, PackageOpen,
    ShoppingCart, Truck, Container, FolderTree, ClipboardX, Scale, PackageX,
    // ─── Stock v2 (7.4 Contrôle des mouvements) ───
    FileInput, FileOutput, SlidersHorizontal, Tags, PackageCheck,
    // ─── Stock v2 (7.5 Analyse des consommations) ───
    CalendarRange, ChartColumn, ChartPie, Grid3x3, HardHat, Gift, Coins, CircleCheck,
    // ─── Stock v2 (7.6 Valorisation financière) ───
    Percent, Receipt, ChevronUp,
  })
);
