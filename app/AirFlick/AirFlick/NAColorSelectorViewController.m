//
//  NAColorSelectorViewController.m
//  airflick
//
//  Created by Nathan Teetor on 4/13/14.
//  Copyright (c) 2014 Nonstop Akubara LLC. All rights reserved.
//

#import "NAColorSelectorViewController.h"
#import "NAColorsClass.h"
#import "UIColor+Expanded.h"

@interface NAColorSelectorViewController () <UITextFieldDelegate>

//@property (nonatomic,weak) IBOutlet UITextField *color1Field;
//@property (nonatomic,weak) IBOutlet UITextField *color2Field;
//@property (nonatomic,weak) IBOutlet UITextField *color3Field;

@end

@implementation NAColorSelectorViewController

- (id)initWithNibName:(NSString *)nibNameOrNil bundle:(NSBundle *)nibBundleOrNil
{
    self = [super initWithNibName:nibNameOrNil bundle:nibBundleOrNil];
    if (self) {
        // Custom initialization
        UIBarButtonItem *backButton = [[UIBarButtonItem alloc] initWithTitle:@"Back" style:UIBarButtonItemStyleBordered target:self action:@selector(back)];
        self.navigationItem.leftBarButtonItem = backButton;
        self.navigationItem.title = @"Color Selection";

        // get the color storage thingy-ma-what
        NAColorsClass *obj = [NAColorsClass getInstance];
        
        // add textfield to screen
        CGRect textFieldRect = CGRectMake(40, 90, 240, 30);
        UITextField *textField = [[UITextField alloc] initWithFrame:textFieldRect];
        
        textField.borderStyle = UITextBorderStyleRoundedRect;
        textField.placeholder = @"#FF00FF";
        textField.returnKeyType = UIReturnKeyDone;
        textField.delegate = self;
        textField.autocorrectionType = UITextAutocorrectionTypeNo;
        textField.tag = 1;
        textField.text = obj.color1;
        textField.backgroundColor = [UIColor colorWithHexString:obj.color1];
        
        // color 2
        CGRect textField2Rect = CGRectMake(40, 130, 240, 30);
        UITextField *textField2 = [[UITextField alloc] initWithFrame:textField2Rect];
        
        textField2.borderStyle = UITextBorderStyleRoundedRect;
        textField2.placeholder = @"#00FF00";
        textField2.returnKeyType = UIReturnKeyDone;
        textField2.delegate = self;
        textField2.autocorrectionType = UITextAutocorrectionTypeNo;
        textField2.tag = 2;
        textField2.text = obj.color2;
        textField2.backgroundColor = [UIColor colorWithHexString:obj.color2];
        
        // color 3
        CGRect textField3Rect = CGRectMake(40, 170, 240, 30);
        UITextField *textField3 = [[UITextField alloc] initWithFrame:textField3Rect];
        
        textField3.borderStyle = UITextBorderStyleRoundedRect;
        textField3.placeholder = @"#00FFFF";
        textField3.returnKeyType = UIReturnKeyDone;
        textField3.delegate = self;
        textField3.autocorrectionType = UITextAutocorrectionTypeNo;
        textField3.tag = 3;
        textField3.text = obj.color3;
        textField3.backgroundColor = [UIColor colorWithHexString:obj.color3];
        
        // add text field sub views
        [self.view addSubview:textField];
        [self.view addSubview:textField2];
        [self.view addSubview:textField3];
    }
    return self;
}

- (void)back{
    [self dismissViewControllerAnimated:NO completion:nil];
}

- (BOOL)textFieldShouldReturn:(UITextField *)textField {
    NSLog(@"%@",textField.text);
    
    if ([textField.text length] != 7) {
        [[[UIAlertView alloc] initWithTitle:@"Whoops!"
                                   message:@"Expected hex string"
                                  delegate:self
                         cancelButtonTitle:@"OK"
                          otherButtonTitles:nil] show];
        textField.backgroundColor = [UIColor whiteColor];
        return YES;
    } else {
        NAColorsClass *obj = [NAColorsClass getInstance];
        [textField resignFirstResponder];
        textField.text = [textField.text uppercaseString];
        
        
        switch (textField.tag) {
            case 1:
                NSLog(@"updated color1");
                obj.color1 = textField.text;
                textField.backgroundColor = [UIColor colorWithHexString:textField.text];
                break;
            case 2:
                NSLog(@"updated color2");
                obj.color2 = textField.text;
                textField.backgroundColor = [UIColor colorWithHexString:textField.text];
                break;
            case 3:
                NSLog(@"updated color3");
                obj.color3 = textField.text;
                textField.backgroundColor = [UIColor colorWithHexString:textField.text];
                break;
            default:
                break;
        }

        // used for changing font color depending on the darkness of the background color
        CGFloat red = 0.0, green = 0.0, blue = 0.0, alpha = 0.0;
        CGFloat threshold = 0.25;
        [textField.backgroundColor getRed:&red green:&green blue:&blue alpha:&alpha];
        NSLog(@"red %f green %f blue %f",red,green,blue);
        CGFloat bgDelta = ((red * 299) + (green * 587) + (blue * 114)) / 1000;
        NSLog(@"bgDelta = %f",bgDelta);
        textField.textColor = (bgDelta > threshold) ? [UIColor blackColor] : [UIColor whiteColor];
        
        return YES;
    }
}

- (void)viewDidLoad
{
    [super viewDidLoad];
    // Do any additional setup after loading the view from its nib.
}

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

@end
